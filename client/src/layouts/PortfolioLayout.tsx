import FloatingChat from "@/components/Chatbot/FloatingChat";
import { Outlet } from "react-router";

export default function PortfolioLayout() {
	return (
		<div className="app-shell min-h-dvh bg-cover bg-center">
			{/* Main Template */}
			<div className="max-w-4xl mx-auto px-3 sm:px-4 pt-5 sm:pt-6 md:pt-8">
				<Outlet />
			</div>

			{/* Chat Feature */}
			<FloatingChat />
		</div>
	);
}
