import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
    type AssistantMessage,
    type AssistantMessageEventStream,
    type Context,
    type Model,
    type SimpleStreamOptions,
    calculateCost,
    createAssistantMessageEventStream,
} from "@mariozechner/pi-ai";
import { spawn } from "child_process";
import { formatContext } from "./format-context";

interface RateLimitInfo { status: string; resetsAt?: string; }
let latestRateLimits: Record<string, RateLimitInfo> = {}; // rateLimitType -> info

function streamClaudeCli(
    model: Model<any>,
    context: Context,
    options?: SimpleStreamOptions
): AssistantMessageEventStream {
    const stream = createAssistantMessageEventStream();

    (async () => {
        const output: AssistantMessage = {
            role: "assistant",
            content: [],
            api: "claude-cli",
            provider: "claude-cli",
            model: model.id,
            usage: {
                input: 0,
                output: 0,
                cacheRead: 0,
                cacheWrite: 0,
                totalTokens: 0,
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
            },
            stopReason: "stop",
            timestamp: Date.now(),
        };

        try {
            stream.push({ type: "start", partial: output });

            const { history } = formatContext(context);
            
            const args = [
                "-p",
                "--model", model.id,
                "--permission-mode", "bypassPermissions",
                "--output-format", "stream-json",
                "--include-partial-messages",
                "--verbose",
            ];

            const child = spawn("claude", args, {
                stdio: ["pipe", "pipe", "pipe"],
                signal: options?.signal,
            });

            child.stdin.write(history);
            child.stdin.end();

            output.content.push({ type: "text", text: "" });
            const contentIndex = output.content.length - 1;
            stream.push({ type: "text_start", contentIndex, partial: output });

            let stdoutBuffer = "";
            let lastFullAssistantText = "";

            const appendText = (delta: string) => {
                if (!delta) return;
                const block = output.content[contentIndex];
                if (block.type === "text") {
                    block.text += delta;
                    stream.push({ type: "text_delta", contentIndex, delta, partial: output });
                }
            };

            const handleJsonLine = (line: string) => {
                if (!line.trim()) return;
                try {
                    const event = JSON.parse(line);

                    if (event.type === "stream_event") {
                        const inner = event.event;
                        if (inner?.type === "content_block_delta" && inner.delta?.type === "text_delta") {
                            appendText(inner.delta.text ?? "");
                            return;
                        }
                        if (inner?.type === "message_delta" && inner.usage) {
                            output.usage.input = inner.usage.input_tokens ?? output.usage.input;
                            output.usage.output = inner.usage.output_tokens ?? output.usage.output;
                            output.usage.cacheRead = inner.usage.cache_read_input_tokens ?? output.usage.cacheRead;
                            output.usage.cacheWrite = inner.usage.cache_creation_input_tokens ?? output.usage.cacheWrite;
                            output.usage.totalTokens =
                                output.usage.input + output.usage.output + output.usage.cacheRead + output.usage.cacheWrite;
                        }
                        return;
                    }

                    if (event.type === "assistant") {
                        const text = event.message?.content
                            ?.filter((part: any) => part.type === "text")
                            .map((part: any) => part.text)
                            .join("") ?? "";
                        lastFullAssistantText = text || lastFullAssistantText;
                        return;
                    }

                    if (event.type === "system" && event.subtype === "hook_response") {
                        return;
                    }

                    if (event.type === "rate_limit_event") {
                        const info = event.rate_limit_info;
                        if (info?.rateLimitType && info?.status) {
                            latestRateLimits[info.rateLimitType] = {
                                status: info.status,
                                resetsAt: info.resetsAt,
                            };
                        }
                        return;
                    }

                    if (event.type === "result") {
                        output.usage.input = event.usage?.input_tokens ?? output.usage.input;
                        output.usage.output = event.usage?.output_tokens ?? output.usage.output;
                        output.usage.cacheRead = event.usage?.cache_read_input_tokens ?? output.usage.cacheRead;
                        output.usage.cacheWrite = event.usage?.cache_creation_input_tokens ?? output.usage.cacheWrite;
                        output.usage.totalTokens =
                            output.usage.input + output.usage.output + output.usage.cacheRead + output.usage.cacheWrite;
                        return;
                    }
                } catch {
                    appendText(line + "\n");
                }
            };

            child.stdout.on("data", (data) => {
                stdoutBuffer += data.toString();
                const lines = stdoutBuffer.split("\n");
                stdoutBuffer = lines.pop() ?? "";
                for (const line of lines) handleJsonLine(line);
            });

            child.stderr.on("data", (data) => {
                console.error(`claude stderr: ${data}`);
            });

            child.on("close", (code) => {
                if (stdoutBuffer.trim()) handleJsonLine(stdoutBuffer);
                if (code !== 0) {
                    output.stopReason = "error";
                    output.errorMessage = `claude exited with code ${code}`;
                    stream.push({ type: "error", reason: "error", error: output });
                } else {
                    const block = output.content[contentIndex];
                    if (block.type === "text") {
                       stream.push({ type: "text_end", contentIndex, content: block.text, partial: output });
                    }
                    output.stopReason = "stop";
                    // Note: claude doesn't provide token usage, so it's not calculated.
                    stream.push({ type: "done", reason: "stop", message: output });
                }
                stream.end();
            });

            child.on("error", (err) => {
                output.stopReason = "error";
                output.errorMessage = err.message;
                stream.push({ type: "error", reason: "error", error: output });
                stream.end();
            });

        } catch (error) {
            output.stopReason = options?.signal?.aborted ? "aborted" : "error";
            output.errorMessage = error instanceof Error ? error.message : String(error);
            stream.push({ type: "error", reason: output.stopReason, error: output });
            stream.end();
        }
    })();

    return stream;
}

export default function (pi: ExtensionAPI) {
    pi.on("turn_end", async (_event, ctx) => {
        const entries = Object.entries(latestRateLimits);
        if (entries.length === 0) {
            ctx.ui.setStatus("claude-quota", "");
            return;
        }
        const parts = entries.map(([type, info]) => {
            const label = type === "five_hour" ? "5h" : type === "seven_day" ? "7d" : type;
            let detail = info.status;
            if (info.resetsAt) {
                const msLeft = new Date(info.resetsAt).getTime() - Date.now();
                if (msLeft > 0) {
                    const totalMin = Math.ceil(msLeft / 60000);
                    const h = Math.floor(totalMin / 60);
                    const m = totalMin % 60;
                    detail = h > 0 ? `resets ${h}h${m}m` : `resets ${m}m`;
                }
            }
            return `${label}: ${detail}`;
        });
        ctx.ui.setStatus("claude-quota", `quota: ${parts.join(" · ")}`);
    });

    pi.registerProvider("claude-cli", {
        baseUrl: "https://cli.local", // Required by pi when registering models; unused by this custom stream provider.
        apiKey: "claude-cli", // Required by pi validation; treated as a literal placeholder so /model shows the provider.
        api: "claude-cli", // Custom API type
        streamSimple: streamClaudeCli,
        models: [
            {
                id: "claude-sonnet-4-6",
                name: "Claude Sonnet 4.6 (CLI)",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 200000,
                maxTokens: 64000,
            },
            {
                id: "claude-opus-4-6",
                name: "Claude Opus 4.6 (CLI)",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 200000,
                maxTokens: 128000,
            },
            {
                id: "claude-sonnet-4-5",
                name: "Claude Sonnet 4.5 (CLI)",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 200000,
                maxTokens: 64000,
            },
            {
                id: "claude-opus-4-5",
                name: "Claude Opus 4.5 (CLI)",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 200000,
                maxTokens: 64000,
            },
            {
                id: "claude-haiku-4-5",
                name: "Claude Haiku 4.5 (CLI)",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 200000,
                maxTokens: 64000,
            },
        ],
    });
}
