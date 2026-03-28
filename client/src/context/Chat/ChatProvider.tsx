import { useState, type ReactNode } from "react";
import ChatContext from "./ChatContext";

export default function ChatProvider({ children }: { children: ReactNode }) {
	const [isChatOpen, setIsChatOpen] = useState(false);

	return (
		<ChatContext.Provider value={{ isChatOpen, setIsChatOpen }}>
			{children}
		</ChatContext.Provider>
	);
}
