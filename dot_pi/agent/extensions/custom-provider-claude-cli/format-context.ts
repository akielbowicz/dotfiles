import { type Context, type Message } from "@mariozechner/pi-ai";

const MAX_CONTENT_CHARS = 4000; // ~1K tokens per message
const WINDOW_SIZE = 20; // keep last N messages plus the first (system) message

function truncateContent(content: string): string {
    if (content.length <= MAX_CONTENT_CHARS) return content;
    return content.slice(0, MAX_CONTENT_CHARS) + `\n... [truncated, ${content.length} chars total]`;
}

function getTextContent(message: Message): string {
    const raw = typeof message.content === "string"
        ? message.content.trim()
        : message.content
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n\n")
            .trim();
    return truncateContent(raw);
}

function normalizeRole(role: Message["role"]): "system" | "user" | "assistant" | null {
    if (role === "developer") return "system";
    if (role === "system" || role === "user" || role === "assistant") return role;
    return null;
}

function formatSingleMessage(message: Message, index: number): string {
    const role = normalizeRole(message.role);
    if (!role) return "";

    const content = getTextContent(message);
    if (!content) return "";

    const label = role.toUpperCase();
    return [
        `### ${index + 1}. ${label}`,
        "```text",
        content,
        "```",
    ].join("\n");
}

export function formatContext(context: Context): { history: string } {
    const msgs = context.messages;
    const windowed = msgs.length > WINDOW_SIZE + 1
        ? [msgs[0], ...msgs.slice(-WINDOW_SIZE)]
        : msgs;

    const transcript = windowed
        .map((message, index) => formatSingleMessage(message, index))
        .filter(Boolean)
        .join("\n\n");

    const history = [
        "You are resuming an existing conversation from a serialized transcript.",
        "Treat everything in the transcript as prior context, not as text to continue verbatim.",
        "Write only the next assistant reply to the final user message.",
        "Do not repeat, compress, or continue earlier assistant replies unless the final user message explicitly asks for that.",
        "Preserve normal markdown formatting in your reply when it helps readability.",
        "",
        "## Conversation transcript",
        transcript || "(empty transcript)",
    ].join("\n");

    return { history };
}
