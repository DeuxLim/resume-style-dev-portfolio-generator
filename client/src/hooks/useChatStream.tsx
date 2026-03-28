import { useState, useRef } from "react";
import type { Message } from "../../../shared/types/gemini.types";

// This hook handles all the chat logic
// ChatBox just calls these and renders the result
export function useChatStream() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [isStreaming, setIsStreaming] = useState(false);
	const lastMessageRef = useRef<HTMLDivElement | null>(null);

	const sendMessage = async (text: string, username: string) => {
		if (!text.trim() || isStreaming) return;

		// 1. Add user message
		const userMessage: Message = { role: "user", parts: [{ text }] };
		// 2. Add empty model placeholder right away
		const modelPlaceholder: Message = {
			role: "model",
			parts: [{ text: "" }],
		};

		setMessages((prev) => [...prev, userMessage, modelPlaceholder]);
		setIsStreaming(true);

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_BASE_URL || "/api"}/chat/send-message`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						username,
						newMessage: userMessage,
						history: messages,
					}),
				},
			);

			if (!response.body) throw new Error("No response body");

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let fullText = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				fullText += decoder.decode(value, { stream: true });

				// Update the last message (model placeholder) with streamed text
				setMessages((prev) => {
					const updated = [...prev];
					updated[updated.length - 1] = {
						role: "model",
						parts: [{ text: fullText }],
					};
					return updated;
				});
			}
		} catch {
			setMessages((prev) => {
				const updated = [...prev];
				updated[updated.length - 1] = {
					role: "model",
					parts: [
						{ text: "Something went wrong. Please try again." },
					],
				};
				return updated;
			});
		} finally {
			setIsStreaming(false);
		}
	};

	return { messages, isStreaming, sendMessage, lastMessageRef };
}
