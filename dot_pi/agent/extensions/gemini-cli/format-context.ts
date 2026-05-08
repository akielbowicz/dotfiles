import { type Context, type Message } from "@mariozechner/pi-ai";

function getTextContent(message: Message): string {
	if (typeof message.content === "string") return message.content.trim();
	const textParts = message.content
		.filter((part) => part.type === "text")
		.map((part) => (part as { text: string }).text);
	return textParts.join('__GEMINI_CLI_NEWLINE__').trim();
}

function formatSingleMessage(message: Message): string | null {
	const role = message.role;
	const content = getTextContent(message);

	if (!content) return null;

	if (role === "user" || role === "developer") {
		return "Human: " + content;
	} else if (role === "assistant") {
		return "Assistant: " + content;
	} else if (role === "system") {
		return content;
	}
	return null;
}

export function formatContext(context: Context): { history: string } {
	const history = context.messages
		.map(formatSingleMessage)
		.filter((line) => line !== null)
		.join('__GEMINI_CLI_NEWLINE__');

	return { history };
}
