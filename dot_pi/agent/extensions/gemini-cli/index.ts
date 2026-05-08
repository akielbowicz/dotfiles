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
import { formatContext } from "./format-context";

function streamGeminiCli(
    model: Model<any>,
    context: Context,
    options?: SimpleStreamOptions
): AssistantMessageEventStream {
    const stream = createAssistantMessageEventStream();

    (async () => {
        const output: AssistantMessage = {
            role: "assistant",
            content: [],
            api: "gemini-cli",
            provider: "gemini-cli",
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

            let { history } = formatContext(context);
            history = history.replace(/__GEMINI_CLI_NEWLINE__/g, "\n\n");

            const args = [
                "--model", model.id,
                "--output-format", "stream-json",
                "--yolo",
                "--prompt", history,
            ];

            const child = spawn("gemini", args, {
                stdio: ["pipe", "pipe", "pipe"],
                signal: options?.signal,
            });

            child.stdin.end();

            output.content.push({ type: "text", text: "" });
            const contentIndex = output.content.length - 1;
            stream.push({ type: "text_start", contentIndex, partial: output });

            let stdoutBuffer = "";
            let stderrBuffer = "";

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

                    if (event.type === "message" && event.role === "assistant" && event.delta) {
                        appendText(event.content ?? "");
                        return;
                    }

                    if (event.type === "result") {
                        output.usage.input = event.stats?.input_tokens ?? output.usage.input;
                        output.usage.output = event.stats?.output_tokens ?? output.usage.output;
                        output.usage.totalTokens = event.stats?.total_tokens ?? output.usage.totalTokens;
                        return;
                    }
                } catch {
                    // non-JSON lines — ignore
                }
            };

            child.stdout.on("data", (data) => {
                stdoutBuffer += data.toString();
                const lines = stdoutBuffer.split("\n");
                stdoutBuffer = lines.pop() ?? "";
                for (const line of lines) handleJsonLine(line);
            });

            child.stderr.on("data", (data) => {
                stderrBuffer += data.toString();
            });

            child.on("close", (code) => {
                if (stdoutBuffer.trim()) handleJsonLine(stdoutBuffer);
                if (code !== 0) {
                    output.stopReason = "error";
                    output.errorMessage = `gemini exited with code ${code}:\n${stderrBuffer}`;
                    stream.push({ type: "error", reason: "error", error: output });
                } else {
                    const block = output.content[contentIndex];
                    if (block.type === "text") {
                        stream.push({ type: "text_end", contentIndex, content: block.text, partial: output });
                    }
                    output.stopReason = "stop";
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
    pi.registerProvider("gemini-cli", {
        baseUrl: "https://cli.local",
        apiKey: "gemini-cli",
        api: "gemini-cli",
        streamSimple: streamGeminiCli,
        models: [
            {
                id: "gemini-2.5-pro",
                name: "Gemini 2.5 Pro (CLI)",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 1048576,
                maxTokens: 65536,
            },
            {
                id: "gemini-2.5-flash",
                name: "Gemini 2.5 Flash (CLI)",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 1048576,
                maxTokens: 65536,
            },
            {
                id: "gemini-2.0-flash-exp",
                name: "Gemini 2.0 Flash Exp (CLI)",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 1048576,
                maxTokens: 8192,
            },
        ],
    });
}
