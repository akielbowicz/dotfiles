import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
    type AssistantMessage,
    type AssistantMessageEventStream,
    type Context,
    type Model,
    type SimpleStreamOptions,
    createAssistantMessageEventStream,
} from "@mariozechner/pi-ai";
import { spawn } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { formatContext } from "./format-context";

interface RateLimitInfo { status: string; resetsAt?: string; }
let latestRateLimits: Record<string, RateLimitInfo> = {};

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

            const { history, systemPrompt } = formatContext(context, model.contextWindow);

            const args = [
                "-p",
                "--model", model.id,
                "--permission-mode", "bypassPermissions",
                "--output-format", "stream-json",
                "--include-partial-messages",
                "--verbose",
            ];

            const SYSTEM_PROMPT_ARG_LIMIT = 100_000;
            let systemPromptTempFile: string | undefined;

            if (systemPrompt) {
                if (systemPrompt.length <= SYSTEM_PROMPT_ARG_LIMIT) {
                    args.push("--system-prompt", systemPrompt);
                } else {
                    systemPromptTempFile = join(tmpdir(), `pi-claude-sysprompt-${process.pid}-${Date.now()}.txt`);
                    writeFileSync(systemPromptTempFile, systemPrompt);
                    args.push("--system-prompt-file", systemPromptTempFile);
                }
            }

            const child = spawn("claude", args, {
                stdio: ["pipe", "pipe", "pipe"],
                signal: options?.signal,
            });

            const cleanupTempFile = () => {
                if (systemPromptTempFile) {
                    try { unlinkSync(systemPromptTempFile); } catch {}
                    systemPromptTempFile = undefined;
                }
            };

            child.stdin.write(history);
            child.stdin.end();

            output.content.push({ type: "text", text: "" });
            const contentIndex = output.content.length - 1;
            stream.push({ type: "text_start", contentIndex, partial: output });

            let stdoutBuffer = "";

            const appendText = (delta: string) => {
                if (!delta) return;
                const block = output.content[contentIndex];
                if (block.type === "text") {
                    block.text += delta;
                    stream.push({ type: "text_delta", contentIndex, delta, partial: output });
                }
            };

            const updateUsage = (usage: any) => {
                output.usage.input = usage.input_tokens ?? output.usage.input;
                output.usage.output = usage.output_tokens ?? output.usage.output;
                output.usage.cacheRead = usage.cache_read_input_tokens ?? output.usage.cacheRead;
                output.usage.cacheWrite = usage.cache_creation_input_tokens ?? output.usage.cacheWrite;
                output.usage.totalTokens = output.usage.input + output.usage.output;
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
                            updateUsage(inner.usage);
                        }
                        return;
                    }

                    if (event.type === "assistant") {
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
                        if (event.usage) updateUsage(event.usage);
                        return;
                    }
                } catch {
                    console.error(`claude stdout (unparseable): ${line}`);
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

            let streamEnded = false;
            const endStream = () => {
                if (!streamEnded) { streamEnded = true; cleanupTempFile(); stream.end(); }
            };

            child.on("close", (code, signal) => {
                if (stdoutBuffer.trim()) handleJsonLine(stdoutBuffer);
                if (signal) {
                    output.stopReason = "aborted";
                    output.errorMessage = `claude killed by signal ${signal}`;
                    stream.push({ type: "error", reason: "aborted", error: output });
                } else if (code !== 0) {
                    output.stopReason = "error";
                    output.errorMessage = `claude exited with code ${code}`;
                    stream.push({ type: "error", reason: "error", error: output });
                } else {
                    const block = output.content[contentIndex];
                    if (block.type === "text") {
                       stream.push({ type: "text_end", contentIndex, content: block.text, partial: output });
                    }
                    output.stopReason = "stop";
                    stream.push({ type: "done", reason: "stop", message: output });
                }
                endStream();
            });

            child.on("error", (err) => {
                output.stopReason = "error";
                output.errorMessage = err.message;
                stream.push({ type: "error", reason: "error", error: output });
                endStream();
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
        baseUrl: "https://cli.local",
        apiKey: "claude-cli",
        api: "claude-cli",
        streamSimple: streamClaudeCli,
        models: [
            {
                id: "claude-opus-4-7",
                name: "Claude Opus 4.7 (CLI)",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 200000,
                maxTokens: 128000,
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
                id: "claude-sonnet-4-6",
                name: "Claude Sonnet 4.6 (CLI)",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 200000,
                maxTokens: 64000,
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
                id: "claude-haiku-4-5-20251001",
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
