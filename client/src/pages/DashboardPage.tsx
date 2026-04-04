import { api } from "@/lib/axios.client";
import { sessionQueryKey, useSession } from "@/hooks/useSession";
import type {
	EditablePortfolio,
	PortfolioVersionSummary,
} from "../../../shared/types/portfolio.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Globe, Layers, PencilLine, Plus, Trash2, TrendingUp } from "lucide-react";

export default function DashboardPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const sessionQuery = useSession();
	const [pendingDeleteVersionId, setPendingDeleteVersionId] = useState<number | null>(
		null,
	);

	useEffect(() => {
		if (sessionQuery.isSuccess && !sessionQuery.data?.user) {
			navigate("/login");
		}
	}, [navigate, sessionQuery.data, sessionQuery.isSuccess]);

	const portfolioQuery = useQuery({
		queryKey: ["my-portfolio"],
		queryFn: async () => {
			const { data } = await api.get<{ portfolio: EditablePortfolio }>(
				"/portfolios/me",
			);
			return data.portfolio;
		},
		enabled: Boolean(sessionQuery.data?.user),
	});

	const versionsQuery = useQuery({
		queryKey: ["my-portfolio-versions"],
		queryFn: async () => {
			const { data } = await api.get<{ versions: PortfolioVersionSummary[] }>(
				"/portfolios/me/versions",
			);
			return data.versions;
		},
		enabled: Boolean(sessionQuery.data?.user),
	});

	const createVersionMutation = useMutation({
		mutationFn: async () => api.post("/portfolios/me/versions", {}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio-versions"] });
			navigate("/dashboard/edit");
		},
	});

	const activateVersionMutation = useMutation({
		mutationFn: async (versionId: number) =>
			api.put(`/portfolios/me/versions/${versionId}/activate`),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio"] });
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio-versions"] });
		},
	});

	const deleteVersionMutation = useMutation({
		mutationFn: async (versionId: number) =>
			api.delete(`/portfolios/me/versions/${versionId}`),
		onSuccess: async () => {
			setPendingDeleteVersionId(null);
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio-versions"] });
		},
	});

	const logoutMutation = useMutation({
		mutationFn: async () => api.post("/auth/logout"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
			navigate("/");
		},
	});

	const publicLink = useMemo(() => {
		const username =
			portfolioQuery.data?.username ?? sessionQuery.data?.user?.username;
		if (!username) return "";
		return `${window.location.origin}/${username}`;
	}, [portfolioQuery.data?.username, sessionQuery.data?.user?.username]);

	const activeVersion = versionsQuery.data?.find((version) => version.isActive);

	if (
		sessionQuery.isLoading ||
		portfolioQuery.isLoading ||
		versionsQuery.isLoading
	) {
		return <div className="app-card p-6">Loading dashboard...</div>;
	}

	return (
		<main className="space-y-5">
			<Card className="border-border/70 bg-gradient-to-br from-sky-500/10 via-emerald-500/7 to-transparent shadow-none">
				<CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
					<div className="space-y-2">
						<Badge variant="secondary" className="w-fit">
							<TrendingUp className="mr-1 size-3.5" />
							Dashboard
						</Badge>
						<CardTitle className="text-2xl sm:text-3xl">
							{portfolioQuery.data?.fullName || "Portfolio Dashboard"}
						</CardTitle>
						<CardDescription>
							Manage your portfolio versions from draft to live.
						</CardDescription>
					</div>
					<div className="flex flex-wrap gap-2">
						<Link
							to="/dashboard/edit"
							className={buttonVariants({ variant: "outline" })}
						>
							<PencilLine className="size-4" />
							Edit active
						</Link>
						<Button
							type="button"
							onClick={() => createVersionMutation.mutate()}
							disabled={createVersionMutation.isPending}
						>
							<Plus className="size-4" />
							{createVersionMutation.isPending ? "Creating..." : "New version"}
						</Button>
						<Button
							type="button"
							variant="ghost"
							onClick={() => logoutMutation.mutate()}
						>
							Log out
						</Button>
					</div>
				</CardHeader>
			</Card>

			<section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_.8fr]">
				<Card className="border-border/70 shadow-none">
					<CardHeader>
						<div className="flex items-center justify-between gap-2">
							<CardTitle className="text-lg">Live portfolio</CardTitle>
							{activeVersion && (
								<Badge variant="secondary">Active: {activeVersion.name}</Badge>
							)}
						</div>
						<CardDescription>
							This link is what recruiters and clients see right now.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
							<div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
								Public URL
							</div>
							<div className="mt-1 break-all font-medium">
								{publicLink || "No public link"}
							</div>
						</div>
						<div className="flex flex-wrap gap-2">
							<Link
								to={`/${portfolioQuery.data?.username ?? ""}`}
								className={buttonVariants({ variant: "outline" })}
								target="_blank"
								rel="noreferrer noopener"
							>
								<Globe className="size-4" />
								Open live page
							</Link>
							<Button
								type="button"
								variant="secondary"
								onClick={async () => {
									if (!publicLink) return;
									try {
										await navigator.clipboard.writeText(publicLink);
									} catch {
										// no-op
									}
								}}
							>
								Copy link
							</Button>
						</div>
					</CardContent>
				</Card>

				<Card className="border-border/70 shadow-none">
					<CardHeader>
						<CardTitle className="text-lg">Snapshot</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Versions</span>
							<span className="font-medium">{versionsQuery.data?.length ?? 0}</span>
						</div>
						<Separator />
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Projects</span>
							<span className="font-medium">
								{portfolioQuery.data?.projects.length ?? 0}
							</span>
						</div>
						<Separator />
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Tech categories</span>
							<span className="font-medium">
								{portfolioQuery.data?.techCategories.length ?? 0}
							</span>
						</div>
					</CardContent>
				</Card>
			</section>

			<Card className="border-border/70 shadow-none">
				<CardHeader>
					<div className="flex items-center justify-between gap-2">
						<div>
							<CardTitle className="text-lg">Version timeline</CardTitle>
							<CardDescription>
								Promote any version to live without changing your URL.
							</CardDescription>
						</div>
						<Badge variant="outline">
							<Layers className="mr-1 size-3.5" />
							{versionsQuery.data?.length ?? 0} total
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-3">
					{versionsQuery.data?.map((version) => (
						<div
							key={version.id}
							className={cn(
								"rounded-xl border p-3 sm:flex sm:items-center sm:justify-between",
								version.isActive
									? "border-emerald-500/40 bg-emerald-500/10"
									: "bg-muted/20",
							)}
						>
							<div className="space-y-1">
								<div className="font-medium">{version.name}</div>
								<div className="text-xs text-muted-foreground">
									Updated:{" "}
									{version.updatedAt
										? new Date(version.updatedAt).toLocaleString()
										: "N/A"}
								</div>
							</div>
							<div className="mt-3 flex items-center gap-2 sm:mt-0">
								{version.isActive ? (
									<span
										className={cn(
											buttonVariants({ variant: "secondary", size: "sm" }),
											"pointer-events-none",
										)}
									>
										Live
									</span>
								) : (
									<>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => activateVersionMutation.mutate(version.id)}
											disabled={activateVersionMutation.isPending}
										>
											Set live
										</Button>
										{pendingDeleteVersionId === version.id ? (
											<>
												<Button
													type="button"
													variant="destructive"
													size="sm"
													onClick={() => deleteVersionMutation.mutate(version.id)}
													disabled={deleteVersionMutation.isPending}
												>
													Confirm delete
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => setPendingDeleteVersionId(null)}
													disabled={deleteVersionMutation.isPending}
												>
													Cancel
												</Button>
											</>
										) : (
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => setPendingDeleteVersionId(version.id)}
												disabled={deleteVersionMutation.isPending}
											>
												<Trash2 className="size-4" />
												Delete
											</Button>
										)}
									</>
								)}
								<Link
									to="/dashboard/edit"
									className={buttonVariants({ variant: "outline", size: "sm" })}
								>
									Edit
								</Link>
							</div>
						</div>
					))}
				</CardContent>
			</Card>
		</main>
	);
}
