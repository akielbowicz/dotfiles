import { type Context, type Message } from "@mariozechner/pi-ai";

const CHARS_PER_TOKEN = 4;
const CONTEXT_BUDGET_RATIO = 0.8;
const MIN_CONTENT_CHARS = 2000;
const MAX_CONTENT_CHARS = 16000;
const FORMATTING_OVERHEAD = 100;

function truncateContent(content: string, maxChars: number): string {
    if (content.length <= maxChars) return content;
    return content.slice(0, maxChars) + `\n... [truncated, ${content.length} chars total]`;
}

function getRawText(message: Message): string {
    return typeof message.content === "string"
        ? message.content.trim()
        : message.content
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n\n")
            .trim();
}

function normalizeRole(role: Message["role"]): "system" | "user" | "assistant" | null {
    if (role === "developer") return "system";
    if (role === "system" || role === "user" || role === "assistant") return role;
    return null;
}

function formatSingleMessage(message: Message, index: number, maxChars: number): string {
    const role = normalizeRole(message.role);
    if (!role) return "";

    const content = truncateContent(getRawText(message), maxChars);
    if (!content) return "";

    const label = role.toUpperCase();
    return [
        `### ${index + 1}. ${label}`,
        "```text",
        content,
        "```",
    ].join("\n");
}

export function formatContext(context: Context, contextWindow: number = 200000): { history: string; systemPrompt?: string } {
    const msgs = context.messages;

    const budgetChars = Math.floor(contextWindow * CHARS_PER_TOKEN * CONTEXT_BUDGET_RATIO);

    let systemPrompt: string | undefined;
    let conversationMsgs = msgs;
    if (msgs.length > 0 && (msgs[0].role === "system" || msgs[0].role === "developer")) {
        systemPrompt = getRawText(msgs[0]);
        conversationMsgs = msgs.slice(1);
    }

    const remainingBudget = budgetChars - (systemPrompt?.length ?? 0);
    const msgCount = Math.max(conversationMsgs.length, 1);
    const perMessageChars = Math.min(
        MAX_CONTENT_CHARS,
        Math.max(MIN_CONTENT_CHARS, Math.floor(remainingBudget / msgCount)),
    );

    let windowed = conversationMsgs;
    let droppedCount = 0;
    if (conversationMsgs.length > 1) {
        let totalChars = 0;
        let keepFrom = 0;
        for (let i = conversationMsgs.length - 1; i >= 0; i--) {
            const msgChars = Math.min(getRawText(conversationMsgs[i]).length, perMessageChars) + FORMATTING_OVERHEAD;
            if (totalChars + msgChars > remainingBudget) {
                keepFrom = i + 1;
                break;
            }
            totalChars += msgChars;
        }
        if (keepFrom >= conversationMsgs.length) {
            keepFrom = conversationMsgs.length - 1;
        }
        if (keepFrom > 0) {
            droppedCount = keepFrom;
            windowed = conversationMsgs.slice(keepFrom);
        }
    }

    const parts: string[] = [];

    if (droppedCount > 0) {
        parts.push(`[... ${droppedCount} earlier message${droppedCount > 1 ? "s" : ""} omitted ...]`);
    }

    const formatted = windowed
        .map((message, index) => formatSingleMessage(message, index + droppedCount, perMessageChars))
        .filter(Boolean)
        .join("\n\n");

    if (formatted) parts.push(formatted);

    const history = [
        "You are resuming an existing conversation from a serialized transcript.",
        "Treat everything in the transcript as prior context, not as text to continue verbatim.",
        "Write only the next assistant reply to the final user message.",
        "Do not repeat, compress, or continue earlier assistant replies unless the final user message explicitly asks for that.",
        "Preserve normal markdown formatting in your reply when it helps readability.",
        "",
        "## Conversation transcript",
        parts.length > 0 ? parts.join("\n\n") : "(empty transcript)",
    ].join("\n");

    return { history, systemPrompt };
}
