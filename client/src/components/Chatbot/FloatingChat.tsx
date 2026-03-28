import ChatBox from "@/components/Chatbot/ChatBox";
import ChatHead from "@/components/Chatbot/ChatHead";
import useChat from "@/context/Chat/useChat";
import { AnimatePresence } from "motion/react";

export default function FloatingChat() {
	const { isChatOpen } = useChat();
	return (
		<AnimatePresence initial={false} mode="wait">
			{isChatOpen ? <ChatBox key="chat-box" /> : <ChatHead key="chat-head" />}
		</AnimatePresence>
	);
}
