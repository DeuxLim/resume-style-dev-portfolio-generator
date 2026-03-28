import useChat from "@/context/Chat/useChat";
import { FaMinus } from "react-icons/fa6";
import ChatIntro from "@/components/Chatbot/ChatIntro";
import { useEffect, useState, type ReactNode } from "react";
import { useChatStream } from "@/hooks/useChatStream";
import { ChatThinkingLoader } from "./ChatThinkingLoader";
import me from "@/assets/me.jpeg";
import { HiMiniPaperAirplane } from "react-icons/hi2";
import { motion } from "motion/react";
import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";
import ReactMarkdown from "react-markdown";

export default function ChatBox() {
	const { setIsChatOpen } = useChat();
	const { messages, isStreaming, sendMessage, lastMessageRef } =
		useChatStream();
	const [input, setInput] = useState("");
	const prefersReducedMotion = usePrefersReducedMotion();

	const handleSend = async () => {
		if (!input.trim()) return;
		const text = input;
		setInput(""); // clear input immediately
		await sendMessage(text);
	};

	useEffect(() => {
		lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, lastMessageRef]);

	return (
		<motion.div
			initial={
				prefersReducedMotion
					? false
					: { opacity: 0, y: 18, scale: 0.98 }
			}
			animate={
				prefersReducedMotion
					? undefined
					: { opacity: 1, y: 0, scale: 1 }
			}
			exit={
				prefersReducedMotion
					? undefined
					: { opacity: 0, y: 14, scale: 0.98 }
			}
			transition={
				prefersReducedMotion
					? undefined
					: { duration: 0.22, ease: [0.16, 1, 0.3, 1] }
			}
			className="fixed bottom-4 right-4 md:bottom-0 md:right-8 w-[min(24rem,calc(100vw-2rem))] h-[70dvh] md:h-128 bg-(--app-surface) text-(--app-text) rounded-none shadow-lg overflow-hidden border border-(--app-border)"
		>
			<div className="flex flex-col h-full">
				{/* Header */}
				<div className="w-full h-12 border-b border-(--app-border)">
					<div className="flex px-4 h-full items-center justify-center gap-2">
						<div className="size-8 rounded-none overflow-clip border border-(--app-border)">
							<img src={me} alt="" className="object-cover" />
						</div>
						<div className="flex-1 font-medium">Deux Lim</div>
						<div className="flex gap-2 items-center justify-center">
							<button
								type="button"
								aria-label="Minimize chat"
								onClick={() => setIsChatOpen(false)}
								className="text-xl cursor-pointer text-(--app-muted) hover:text-(--app-text) transition-colors"
							>
								<FaMinus />
							</button>
						</div>
					</div>
				</div>

				{/* Content */}
				<div className="flex-1 p-2.5 sm:p-4 overflow-auto overscroll-contain flex gap-4 flex-col">
					<div className="flex gap-4 flex-col">
						<div className="flex items-end gap-2">
							<div className="w-6 shrink-0 h-full flex items-end">
								<img
									src={me}
									className="size-6 rounded-none"
									alt=""
								/>
							</div>
							<div className="bg-(--app-surface-2) border border-(--app-border) px-4 py-2 rounded-none max-w-[80%] text-[13px] sm:text-sm">
								<ChatIntro />
							</div>
						</div>
					</div>

					<div className="flex gap-4 flex-col">
						{messages
							.filter((msg) => msg.parts[0].text !== "")
							.map(
								(msg, index): ReactNode =>
									msg.role === "model" ? (
										<div
											className="flex items-end gap-2"
											key={index}
										>
											<div className="w-6 shrink-0 h-full flex items-end">
												<img
													src={me}
													className="size-6 rounded-none border border-(--app-border)"
													alt=""
												/>
											</div>
											<div className="bg-(--app-surface-2) border border-(--app-border) px-4 py-2 rounded-none max-w-[80%] text-[13px] sm:text-sm">
												<ReactMarkdown>
													{msg.parts[0].text}
												</ReactMarkdown>
											</div>
										</div>
									) : (
										<div
											className="flex justify-end gap-2"
											key={index}
										>
											<div className="bg-(--app-accent) text-white px-4 py-2 rounded-none max-w-[80%] text-[13px] sm:text-sm">
												{msg.parts[0].text}
											</div>
										</div>
									),
							)}
					</div>

					{isStreaming &&
						messages[messages.length - 1]?.parts[0].text === "" && (
							<ChatThinkingLoader />
						)}

					<div ref={lastMessageRef}></div>
				</div>

				{/* Input */}
				<div className="h-16 flex items-center justify-around gap-3 px-4 border-t border-(--app-border)">
					<input
						type="text"
						placeholder="Aa"
						value={input}
						className="bg-(--app-surface-2) border border-(--app-border) rounded-none px-4 h-9 flex-1 text-[13px] sm:text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent)"
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleSend();
						}}
					/>
					<button
						type="button"
						className="p-2 cursor-pointer hover:bg-(--app-surface-2) rounded-none disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
						onClick={handleSend}
						disabled={!input.trim()}
					>
						<HiMiniPaperAirplane className="text-2xl text-(--app-accent)" />
					</button>
				</div>
			</div>
		</motion.div>
	);
}
