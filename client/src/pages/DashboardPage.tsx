import { api, apiBaseUrl } from "@/lib/axios.client";
import type { AxiosError } from "axios";
import { sessionQueryKey, useSession } from "@/hooks/useSession";
import type {
	EditablePortfolio,
	PortfolioVersionBase,
	PortfolioVersionSummary,
} from "../../../shared/types/portfolio.types";
import type { ResumeRecord, ResumeValidationResult } from "../../../shared/types/resume.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Circle, Download, Eye, FileText, Globe, Layers, Pencil, Plus, Trash2 } from "lucide-react";

const versionBaseOptions: Array<{
	value: PortfolioVersionBase;
	label: string;
	description: string;
}> = [
	{
		value: "latest",
		label: "Most recent",
		description: "Start from the latest updated version snapshot.",
	},
	{
		value: "live",
		label: "Current live",
		description: "Start from what visitors currently see.",
	},
	{
		value: "blank",
		label: "Clean slate",
		description: "Start with empty content fields.",
	},
];

export default function DashboardPage() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const hasCreateVersionQueryParam = searchParams.get("newVersion") === "1";
	const queryClient = useQueryClient();
	const sessionQuery = useSession();
	const [toast, setToast] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);
	const [versionToDelete, setVersionToDelete] = useState<{
		id: number;
		name: string;
	} | null>(null);
	const [versionToRename, setVersionToRename] = useState<{
		id: number;
		name: string;
		nextName: string;
		error: string;
	} | null>(null);
	const [versionToCreate, setVersionToCreate] = useState<{
		name: string;
		base: PortfolioVersionBase;
		error: string;
	} | null>(() =>
		hasCreateVersionQueryParam
			? {
					name: "",
					base: "latest",
					error: "",
				}
			: null,
	);
	const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
		"idle",
	);
	const [publicSlugInput, setPublicSlugInput] = useState("");

	useEffect(() => {
		if (sessionQuery.isSuccess && !sessionQuery.data?.user) {
			navigate("/login");
		}
	}, [navigate, sessionQuery.data, sessionQuery.isSuccess]);

	useEffect(() => {
		if (copyStatus === "idle") return;
		const timeoutId = window.setTimeout(() => {
			setCopyStatus("idle");
		}, 2000);
		return () => window.clearTimeout(timeoutId);
	}, [copyStatus]);

	useEffect(() => {
		if (!toast) return;
		const timeoutId = setTimeout(() => setToast(null), 2400);
		return () => clearTimeout(timeoutId);
	}, [toast]);

	useEffect(() => {
		if (!hasCreateVersionQueryParam) return;
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setVersionToCreate({
			name: "",
			base: "latest",
			error: "",
		});
		const next = new URLSearchParams(searchParams);
		next.delete("newVersion");
		setSearchParams(next, { replace: true });
	}, [hasCreateVersionQueryParam, searchParams, setSearchParams]);

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
	const resumeQuery = useQuery({
		queryKey: ["my-resume"],
		queryFn: async () => {
			const { data } = await api.get<{ resume: ResumeRecord; validation: ResumeValidationResult }>(
				"/resumes/me",
			);
			return data;
		},
		enabled: Boolean(sessionQuery.data?.user),
	});

	const activateVersionMutation = useMutation({
		mutationFn: async (versionId: number) =>
			api.put(`/portfolios/me/versions/${versionId}/activate`),
		onSuccess: async () => {
			setToast({ type: "success", message: "Version is now live." });
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio"] });
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio-versions"] });
		},
		onError: () => {
			setToast({ type: "error", message: "Failed to set live version." });
		},
	});

	const deleteVersionMutation = useMutation({
		mutationFn: async (versionId: number) =>
			api.delete(`/portfolios/me/versions/${versionId}`),
		onSuccess: async () => {
			setToast({ type: "success", message: "Version deleted." });
			setVersionToDelete(null);
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio-versions"] });
		},
		onError: () => {
			setToast({ type: "error", message: "Failed to delete version." });
		},
	});

	const renameVersionMutation = useMutation({
		mutationFn: async (input: { id: number; name: string }) =>
			api.put(`/portfolios/me/versions/${input.id}`, { name: input.name }),
		onSuccess: async () => {
			setToast({ type: "success", message: "Version name updated." });
			setVersionToRename(null);
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio-versions"] });
		},
		onError: () => {
			setToast({ type: "error", message: "Failed to rename version. Please try again." });
			setVersionToRename((current) =>
				current
					? {
							...current,
							error: "Failed to rename version. Please try again.",
						}
					: current,
			);
		},
	});

	const createVersionMutation = useMutation({
		mutationFn: async (input: { name: string; base: PortfolioVersionBase }) => input,
		onSuccess: async (input) => {
			setVersionToCreate(null);
			navigate(
				`/dashboard/create?draft=1&base=${encodeURIComponent(input.base)}&name=${encodeURIComponent(input.name)}`,
			);
		},
		onError: (error) => {
			const responseData = (error as AxiosError<{ message?: string }>).response
				?.data;
			const message =
				responseData?.message ?? "Failed to create version. Please try again.";
			setVersionToCreate((current) =>
				current
					? {
							...current,
							error: message,
						}
					: current,
			);
		},
	});

	const updatePublicSlugMutation = useMutation({
		mutationFn: async (slug: string) => {
			const { data } = await api.put<{ portfolio: EditablePortfolio }>(
				"/portfolios/me/slug",
				{ slug },
			);
			return data.portfolio;
		},
		onSuccess: async (portfolio) => {
			setPublicSlugInput(portfolio.username);
			setToast({ type: "success", message: "Public URL updated." });
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio"] });
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
		},
		onError: (error) => {
			const responseData = (error as AxiosError<{ message?: string }>).response
				?.data;
			setToast({
				type: "error",
				message: responseData?.message ?? "Failed to update public URL.",
			});
		},
	});

	const publicLink = useMemo(() => {
		const username =
			portfolioQuery.data?.username ?? sessionQuery.data?.user?.username;
		if (!username) return "";
		return `${window.location.origin}/${username}`;
	}, [portfolioQuery.data?.username, sessionQuery.data?.user?.username]);
	const resumeTemplateLabel = useMemo(() => {
		const templateKey = resumeQuery.data?.resume.templateKey;
		if (templateKey === "harvard_classic_v1") return "Harvard Classic";
		return "ATS Classic";
	}, [resumeQuery.data?.resume.templateKey]);
	const resumePdfPreviewHref = `${apiBaseUrl}/resumes/me/pdf`;
	const resumePdfDownloadHref = `${apiBaseUrl}/resumes/me/pdf?download=1`;

	useEffect(() => {
		if (!portfolioQuery.data?.username) return;
		setPublicSlugInput(portfolioQuery.data.username);
	}, [portfolioQuery.data?.username]);

	const activeVersion = versionsQuery.data?.find((version) => version.isActive);
	const displayName =
		sessionQuery.data?.user?.fullName ?? sessionQuery.data?.user?.username ?? "";

	if (
		sessionQuery.isLoading ||
		portfolioQuery.isLoading ||
		versionsQuery.isLoading
	) {
		return <div className="app-card p-6">Loading dashboard...</div>;
	}

	const handleDeleteConfirm = () => {
		if (!versionToDelete) return;
		deleteVersionMutation.mutate(versionToDelete.id);
	};

	const handleRenameConfirm = () => {
		if (!versionToRename) return;
		const name = versionToRename.nextName.trim();
		if (!name) {
			setVersionToRename((current) =>
				current ? { ...current, error: "Version name is required." } : current,
			);
			return;
		}
		renameVersionMutation.mutate({ id: versionToRename.id, name });
	};

	const handleCreateConfirm = () => {
		if (!versionToCreate) return;
		const name = versionToCreate.name.trim();
		if (!name) {
			setVersionToCreate((current) =>
				current ? { ...current, error: "Version name is required." } : current,
			);
			return;
		}
		createVersionMutation.mutate({
			name,
			base: versionToCreate.base,
		});
	};

	return (
		<main className="space-y-5">
			{toast ? (
				<div className="fixed right-4 top-4 z-50">
					<div
						className={
							toast.type === "error"
								? "rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 shadow-lg"
								: "rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 shadow-lg"
						}
					>
						{toast.message}
					</div>
				</div>
			) : null}

			<section className="grid grid-cols-1 gap-4">
				<Card className="border-border/70 shadow-none">
					<CardHeader>
						<div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
							<CardTitle className="text-lg">
								Live portfolio
								{displayName ? (
									<span className="ml-2 text-sm font-normal text-muted-foreground">
										{displayName}
									</span>
								) : null}
							</CardTitle>
							{activeVersion ? (
								<Badge variant="secondary">Active: {activeVersion.name}</Badge>
							) : null}
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
						<div className="rounded-lg border bg-background/70 px-3 py-3">
							<div className="space-y-2">
								<div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
									Public URL slug
								</div>
								<div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
									<div className="text-xs text-muted-foreground">
										{window.location.origin}/
									</div>
									<Input
										value={publicSlugInput}
										onChange={(event) => setPublicSlugInput(event.target.value)}
										placeholder="your-public-url"
										className="w-full sm:max-w-xs"
									/>
									<Button
										type="button"
										className="w-full sm:w-auto"
										size="sm"
										onClick={() =>
											updatePublicSlugMutation.mutate(publicSlugInput)
										}
										disabled={
											updatePublicSlugMutation.isPending ||
											!publicSlugInput.trim() ||
											publicSlugInput.trim() ===
												(portfolioQuery.data?.username ?? "")
										}
									>
										{updatePublicSlugMutation.isPending
											? "Saving..."
											: "Save URL"}
									</Button>
								</div>
								<div className="text-xs text-muted-foreground">
									Allowed: lowercase letters, numbers, and hyphens.
								</div>
							</div>
						</div>
					<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
						<Link
							to={`/${portfolioQuery.data?.username ?? ""}`}
							className={`${buttonVariants({ variant: "outline" })} w-full justify-center sm:w-auto`}
							target="_blank"
							rel="noreferrer noopener"
						>
								<Globe className="size-4" />
								Open live page
							</Link>
							<Button
								type="button"
								variant="secondary"
								className="w-full sm:w-auto"
								onClick={async () => {
									if (!publicLink) return;
									try {
										await navigator.clipboard.writeText(publicLink);
										setCopyStatus("success");
									} catch {
										setCopyStatus("error");
									}
								}}
							>
								{copyStatus === "success"
									? "Link copied"
									: copyStatus === "error"
										? "Copy failed"
										: "Copy link"}
							</Button>
						</div>
					</CardContent>
				</Card>
			</section>

			<Card className="border-border/70 shadow-none">
				<CardHeader>
					<div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
						<div>
							<CardTitle className="text-lg">Version timeline</CardTitle>
							<CardDescription>
								Create, rename, edit, and promote versions without changing your URL.
							</CardDescription>
						</div>
						<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
							<Badge variant="outline">
								<Layers className="mr-1 size-3.5" />
								{versionsQuery.data?.length ?? 0} total
							</Badge>
							<Button
								type="button"
								size="sm"
								className="w-full sm:w-auto"
								onClick={() =>
									setVersionToCreate({
										name: "",
										base: "latest",
										error: "",
									})
								}
							>
								<Plus className="size-4" />
								New version
							</Button>
						</div>
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
							<div className="mt-3 grid grid-cols-1 gap-2 sm:mt-0 sm:flex sm:flex-wrap sm:items-center">
								{version.isActive ? (
									<span
										className={cn(
											buttonVariants({ variant: "secondary", size: "sm" }),
											"pointer-events-none border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
										)}
									>
										<Circle className="size-2.5 fill-current text-emerald-500" />
										Live
									</span>
								) : (
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="w-full sm:w-auto"
										onClick={() => activateVersionMutation.mutate(version.id)}
										disabled={activateVersionMutation.isPending}
									>
										Set live
									</Button>
								)}
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="w-full sm:w-auto"
									onClick={() =>
										setVersionToRename({
											id: version.id,
											name: version.name,
											nextName: version.name,
											error: "",
										})
									}
									disabled={renameVersionMutation.isPending}
								>
									<Pencil className="size-4" />
									Rename
								</Button>
								{!version.isActive ? (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="w-full sm:w-auto"
										onClick={() =>
											setVersionToDelete({
												id: version.id,
												name: version.name,
											})
										}
										disabled={deleteVersionMutation.isPending}
									>
										<Trash2 className="size-4" />
										Delete
									</Button>
								) : null}
								<Link
									to={`/dashboard/edit?versionId=${version.id}&preview=1`}
									className={`${buttonVariants({ variant: "outline", size: "sm" })} w-full justify-center sm:w-auto`}
								>
									<Eye className="size-4" />
									Preview
								</Link>
								<Link
									to={`/dashboard/edit?versionId=${version.id}`}
									className={`${buttonVariants({ variant: "outline", size: "sm" })} w-full justify-center sm:w-auto`}
								>
									Edit
								</Link>
							</div>
						</div>
					))}
				</CardContent>
			</Card>

			<Card className="border-border/70 shadow-none">
				<CardHeader>
					<div className="flex items-center justify-between gap-2">
						<div>
							<CardTitle className="text-lg">Resume Builder</CardTitle>
							<CardDescription>
								Manage your resume content and export-ready PDF output.
							</CardDescription>
						</div>
						<FileText className="size-5 text-muted-foreground" />
					</div>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<div className="rounded-lg border bg-muted/20 px-3 py-2">
							<div className="text-xs text-muted-foreground">Template</div>
							<div className="font-medium">{resumeTemplateLabel}</div>
						</div>
						<div className="rounded-lg border bg-muted/20 px-3 py-2">
							<div className="text-xs text-muted-foreground">Errors</div>
							<div className="font-medium">
								{resumeQuery.data?.validation.errors.length ?? 0}
							</div>
						</div>
						<div className="rounded-lg border bg-muted/20 px-3 py-2">
							<div className="text-xs text-muted-foreground">Warnings</div>
							<div className="font-medium">
								{resumeQuery.data?.validation.warnings.length ?? 0}
							</div>
						</div>
						<div className="rounded-lg border bg-muted/20 px-3 py-2">
							<div className="text-xs text-muted-foreground">Pages</div>
							<div className="font-medium">
								{resumeQuery.data?.validation.estimatedPages ?? 1}
							</div>
						</div>
					</div>
					{resumeQuery.data?.resume.updatedAt ? (
						<div className="text-xs text-muted-foreground">
							Updated: {new Date(resumeQuery.data.resume.updatedAt).toLocaleString()}
						</div>
					) : null}
					{resumeQuery.isError ? (
						<div className="text-xs text-destructive">
							Unable to load resume summary right now.
						</div>
					) : null}
					<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
						<Link
							to="/dashboard/resume"
							className={`${buttonVariants({ variant: "outline", size: "sm" })} w-full justify-center sm:w-auto`}
						>
							Open resume builder
						</Link>
						<a
							href={resumePdfPreviewHref}
							target="_blank"
							rel="noreferrer noopener"
							className={`${buttonVariants({ variant: "outline", size: "sm" })} w-full justify-center sm:w-auto`}
						>
							<Eye className="size-4" />
							Preview PDF
						</a>
						<a
							href={resumePdfDownloadHref}
							target="_blank"
							rel="noreferrer noopener"
							className={`${buttonVariants({ variant: "outline", size: "sm" })} w-full justify-center sm:w-auto`}
						>
							<Download className="size-4" />
							Download PDF
						</a>
					</div>
				</CardContent>
			</Card>

			{versionToDelete ? (
				<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-4 sm:items-center sm:py-6">
					<Card className="flex max-h-[85vh] w-full max-w-md flex-col border-border/70 shadow-xl">
						<CardHeader>
							<CardTitle className="text-lg">Delete version?</CardTitle>
							<CardDescription>
								Delete "{versionToDelete.name}"? This cannot be undone.
							</CardDescription>
						</CardHeader>
						<CardContent className="min-h-0 overflow-y-auto">
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setVersionToDelete(null)}
									disabled={deleteVersionMutation.isPending}
								>
									Cancel
								</Button>
								<Button
									type="button"
									variant="destructive"
									onClick={handleDeleteConfirm}
									disabled={deleteVersionMutation.isPending}
								>
									{deleteVersionMutation.isPending ? "Deleting..." : "Delete"}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			) : null}

			{versionToRename ? (
				<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-4 sm:items-center sm:py-6">
					<Card className="flex max-h-[85vh] w-full max-w-md flex-col border-border/70 shadow-xl">
						<CardHeader>
							<CardTitle className="text-lg">Rename version</CardTitle>
							<CardDescription>
								Update the display name for "{versionToRename.name}".
							</CardDescription>
						</CardHeader>
						<CardContent className="min-h-0 space-y-3 overflow-y-auto">
							<Input
								value={versionToRename.nextName}
								onChange={(event) =>
									setVersionToRename((current) =>
										current
											? {
													...current,
													nextName: event.target.value,
													error: "",
												}
											: current,
									)
								}
								maxLength={120}
								placeholder="Version name"
							/>
							{versionToRename.error ? (
								<div className="text-sm text-destructive">{versionToRename.error}</div>
							) : null}
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setVersionToRename(null)}
									disabled={renameVersionMutation.isPending}
								>
									Cancel
								</Button>
								<Button
									type="button"
									onClick={handleRenameConfirm}
									disabled={renameVersionMutation.isPending}
								>
									{renameVersionMutation.isPending ? "Saving..." : "Save name"}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			) : null}

			{versionToCreate ? (
				<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-4 sm:items-center sm:py-6">
					<Card className="flex max-h-[85vh] w-full max-w-lg flex-col border-border/70 shadow-xl">
						<CardHeader>
							<CardTitle className="text-lg">Create new version</CardTitle>
							<CardDescription>
								Choose the base source, then set the version name.
							</CardDescription>
						</CardHeader>
						<CardContent className="min-h-0 space-y-4 overflow-y-auto">
							<div className="space-y-2">
								<div className="text-sm font-medium">Version name</div>
								<Input
									value={versionToCreate.name}
									onChange={(event) =>
										setVersionToCreate((current) =>
											current
												? { ...current, name: event.target.value, error: "" }
												: current,
										)
									}
									maxLength={120}
									placeholder="e.g. Spring Campaign Draft"
								/>
							</div>
							<div className="space-y-2">
								<div className="text-sm font-medium">Base this version on</div>
								<div className="space-y-2">
									{versionBaseOptions.map((option) => (
										<button
											key={option.value}
											type="button"
											className={cn(
												"w-full rounded-lg border px-3 py-2 text-left transition-colors",
												versionToCreate.base === option.value
													? "border-emerald-500/50 bg-emerald-500/10"
													: "border-border hover:bg-muted/40",
											)}
											onClick={() =>
												setVersionToCreate((current) =>
													current ? { ...current, base: option.value } : current,
												)
											}
										>
											<div className="text-sm font-medium">{option.label}</div>
											<div className="text-xs text-muted-foreground">{option.description}</div>
										</button>
									))}
								</div>
							</div>
							{versionToCreate.error ? (
								<div className="text-sm text-destructive">{versionToCreate.error}</div>
							) : null}
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setVersionToCreate(null)}
									disabled={createVersionMutation.isPending}
								>
									Cancel
								</Button>
								<Button
									type="button"
									onClick={handleCreateConfirm}
									disabled={createVersionMutation.isPending}
								>
									{createVersionMutation.isPending ? "Creating..." : "Create version"}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			) : null}
		</main>
	);
}
