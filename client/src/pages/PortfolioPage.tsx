import ChatProvider from "@/context/Chat/ChatProvider";
import FloatingChat from "@/components/Chatbot/FloatingChat";
import PortfolioView from "@/components/portfolio/PortfolioView";
import { api } from "@/lib/axios.client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import type { PublicPortfolio } from "../../../shared/types/portfolio.types";
import { samplePortfolio } from "../../../shared/defaults/portfolio";

export default function PortfolioPage() {
	const params = useParams();
	const username = params.username ?? "";
	const normalizedUsername = username.trim().toLowerCase();

	const portfolioQuery = useQuery({
		queryKey: ["public-portfolio", normalizedUsername],
		queryFn: async () => {
			const { data } = await api.get<{ portfolio: PublicPortfolio }>(
				`/portfolios/${normalizedUsername}`,
			);
			return data.portfolio;
		},
		enabled: Boolean(normalizedUsername),
	});

	const fallbackPortfolio =
		normalizedUsername === samplePortfolio.username ? samplePortfolio : null;
	const resolvedPortfolio = portfolioQuery.data ?? fallbackPortfolio;

	if (portfolioQuery.isLoading && !fallbackPortfolio) {
		return <div className="app-card p-6">Loading portfolio...</div>;
	}

	if (portfolioQuery.isError && !fallbackPortfolio) {
		return (
			<div className="app-card p-6">
				Unable to load portfolio right now. Please refresh and try again.
			</div>
		);
	}

	if (!resolvedPortfolio) {
		return <div className="app-card p-6">Portfolio not found.</div>;
	}

	return (
		<ChatProvider>
			<PortfolioView portfolio={resolvedPortfolio} />
			{portfolioQuery.data?.chatEnabled && (
				<FloatingChat
					username={portfolioQuery.data.username}
					displayName={portfolioQuery.data.fullName}
					avatarUrl={portfolioQuery.data.avatarUrl}
				/>
			)}
		</ChatProvider>
	);
}
