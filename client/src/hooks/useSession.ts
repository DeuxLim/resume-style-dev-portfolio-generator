import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios.client";

type SessionResponse = {
	user: {
		id: number;
		email: string;
		username: string;
		fullName: string;
	} | null;
	portfolioSlug?: string;
};

export const sessionQueryKey = ["session"];

export function useSession() {
	return useQuery({
		queryKey: sessionQueryKey,
		queryFn: async () => {
			const { data } = await api.get<SessionResponse>("/auth/session");
			return data;
		},
		retry: false,
	});
}
