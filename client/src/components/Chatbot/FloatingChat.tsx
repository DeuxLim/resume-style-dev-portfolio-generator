import ChatBox from "@/components/Chatbot/ChatBox";
import ChatHead from "@/components/Chatbot/ChatHead";
import useChat from "@/context/Chat/useChat";
import { AnimatePresence } from "motion/react";

export default function FloatingChat({
	username,
	displayName,
	avatarUrl,
}: {
	username: string;
	displayName: string;
	avatarUrl?: string;
}) {
	const { isChatOpen } = useChat();
	return (
		<AnimatePresence initial={false} mode="wait">
			{isChatOpen ? (
				<ChatBox
					key="chat-box"
					username={username}
					displayName={displayName}
					avatarUrl={avatarUrl}
				/>
			) : (
				<ChatHead
					key="chat-head"
					displayName={displayName}
					avatarUrl={avatarUrl}
				/>
			)}
		</AnimatePresence>
	);
}
