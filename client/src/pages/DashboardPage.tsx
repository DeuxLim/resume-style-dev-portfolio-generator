import { api, apiBaseUrl } from "@/lib/axios.client";
import type { AxiosError } from "axios";
import { useSession } from "@/hooks/useSession";
import PortfolioView from "@/components/portfolio/PortfolioView";
import type {
	EditablePortfolio,
	PortfolioVersionBase,
	PortfolioVersionSummary,
} from "../../../shared/types/portfolio.types";
import type {
	ResumeVersionBase,
	ResumeVersionSummary,
} from "../../../shared/types/resume.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Circle, Eye, Layers, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

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

const resumeVersionBaseOptions: Array<{
	value: ResumeVersionBase;
	label: string;
	description: string;
}> = versionBaseOptions as Array<{
	value: ResumeVersionBase;
	label: string;
	description: string;
}>;

export default function DashboardPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [searchParams, setSearchParams] = useSearchParams();
	const hasCreateVersionQueryParam = searchParams.get("newVersion") === "1";
	const sessionQuery = useSession();
	const [toast, setToast] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);
	const [versionToDelete, setVersionToDelete] = useState<{
		id: number;
		name: string;
	} | null>(null);
	const [resumeVersionToDelete, setResumeVersionToDelete] = useState<{
		id: number;
		name: string;
	} | null>(null);
	const [versionToRename, setVersionToRename] = useState<{
		id: number;
		name: string;
		nextName: string;
		error: string;
	} | null>(null);
	const [resumeVersionToRename, setResumeVersionToRename] = useState<{
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
	const [resumeVersionToCreate, setResumeVersionToCreate] = useState<{
		name: string;
		base: ResumeVersionBase;
		error: string;
	} | null>(null);
	const [previewModal, setPreviewModal] = useState<"portfolio" | "resume" | null>(
		null,
	);
	const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
	const [mobileVersionActionsId, setMobileVersionActionsId] = useState<number | null>(
		null,
	);
	const [mobileResumeVersionActionsId, setMobileResumeVersionActionsId] = useState<
		number | null
	>(null);

	useEffect(() => {
		if (sessionQuery.isSuccess && !sessionQuery.data?.user) {
			navigate("/login");
		}
	}, [navigate, sessionQuery.data, sessionQuery.isSuccess]);

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

	useEffect(() => {
		if (!previewModal) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setPreviewModal(null);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [previewModal]);

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

	const resumeVersionsQuery = useQuery({
		queryKey: ["my-resume-versions"],
		queryFn: async () => {
			const { data } = await api.get<{ versions: ResumeVersionSummary[] }>(
				"/resumes/me/versions",
			);
			return data.versions;
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

	const activateResumeVersionMutation = useMutation({
		mutationFn: async (versionId: number) =>
			api.put(`/resumes/me/versions/${versionId}/activate`),
		onSuccess: async () => {
			setToast({ type: "success", message: "Resume version is now live." });
			await queryClient.invalidateQueries({ queryKey: ["my-resume-versions"] });
			await queryClient.invalidateQueries({ queryKey: ["my-resume"] });
		},
		onError: () => {
			setToast({ type: "error", message: "Failed to set live resume version." });
		},
	});

	const deleteResumeVersionMutation = useMutation({
		mutationFn: async (versionId: number) =>
			api.delete(`/resumes/me/versions/${versionId}`),
		onSuccess: async () => {
			setToast({ type: "success", message: "Resume version deleted." });
			setResumeVersionToDelete(null);
			await queryClient.invalidateQueries({ queryKey: ["my-resume-versions"] });
		},
		onError: () => {
			setToast({ type: "error", message: "Failed to delete resume version." });
		},
	});

	const renameResumeVersionMutation = useMutation({
		mutationFn: async (input: { id: number; name: string }) =>
			api.put(`/resumes/me/versions/${input.id}`, { name: input.name }),
		onSuccess: async () => {
			setToast({ type: "success", message: "Resume version name updated." });
			setResumeVersionToRename(null);
			await queryClient.invalidateQueries({ queryKey: ["my-resume-versions"] });
		},
		onError: () => {
			setToast({
				type: "error",
				message: "Failed to rename resume version. Please try again.",
			});
			setResumeVersionToRename((current) =>
				current
					? {
							...current,
							error: "Failed to rename resume version. Please try again.",
						}
					: current,
			);
		},
	});

	const createResumeVersionMutation = useMutation({
		mutationFn: async (input: { name: string; base: ResumeVersionBase }) => input,
		onSuccess: async (input) => {
			setResumeVersionToCreate(null);
			navigate(
				`/dashboard/resume?draft=1&base=${encodeURIComponent(input.base)}&name=${encodeURIComponent(input.name)}`,
			);
		},
		onError: (error) => {
			const responseData = (error as AxiosError<{ message?: string }>).response
				?.data;
			const message =
				responseData?.message ?? "Failed to create version. Please try again.";
			setResumeVersionToCreate((current) =>
				current
					? {
							...current,
							error: message,
						}
					: current,
			);
		},
	});

	const publicLink = useMemo(() => {
		const username =
			portfolioQuery.data?.username ?? sessionQuery.data?.user?.username;
		if (!username) return "";
		return `${window.location.origin}/${username}`;
	}, [portfolioQuery.data?.username, sessionQuery.data?.user?.username]);

	const activeVersion = versionsQuery.data?.find((version) => version.isActive);
	const activeResumeVersion = resumeVersionsQuery.data?.find((version) => version.isActive);
	const selectedMobileVersion =
		versionsQuery.data?.find((version) => version.id === mobileVersionActionsId) ?? null;
	const selectedMobileResumeVersion =
		resumeVersionsQuery.data?.find(
			(version) => version.id === mobileResumeVersionActionsId,
		) ?? null;
	const resumePdfPreviewHref = `${apiBaseUrl}/resumes/me/pdf`;
	const miniPreviewViewportClassName =
		"overflow-hidden rounded-md border border-border/70";
	const miniPreviewCanvasWidth = 980;
	const miniPortfolioCanvasHeight = 1120;
	const miniResumeCanvasHeight = 980;
	const miniPortfolioScale = 0.2;
	const miniResumeScale = 0.22;
	const miniPortfolioFrameStyle = {
		width: `${miniPreviewCanvasWidth * miniPortfolioScale}px`,
		height: `${miniPortfolioCanvasHeight * miniPortfolioScale}px`,
	};
	const miniResumeFrameStyle = {
		width: `${miniPreviewCanvasWidth * miniResumeScale}px`,
		height: `${miniResumeCanvasHeight * miniResumeScale}px`,
	};
	const miniPortfolioTransformStyle = {
		transform: `scale(${miniPortfolioScale})`,
		transformOrigin: "top left" as const,
	};
	const miniResumeTransformStyle = {
		transform: `scale(${miniResumeScale})`,
		transformOrigin: "top left" as const,
	};

	if (
		sessionQuery.isLoading ||
		portfolioQuery.isLoading ||
		versionsQuery.isLoading ||
		resumeVersionsQuery.isLoading
	) {
		return <div className="app-card p-6">Loading dashboard...</div>;
	}

	const openCreateModal = () =>
		setVersionToCreate({
			name: "",
			base: "latest",
			error: "",
		});

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

	const openResumeCreateModal = () =>
		setResumeVersionToCreate({
			name: "",
			base: "latest",
			error: "",
		});

	const handleResumeCreateConfirm = () => {
		if (!resumeVersionToCreate) return;
		const name = resumeVersionToCreate.name.trim();
		if (!name) {
			setResumeVersionToCreate((current) =>
				current ? { ...current, error: "Version name is required." } : current,
			);
			return;
		}
		createResumeVersionMutation.mutate({
			name,
			base: resumeVersionToCreate.base,
		});
	};

	const handleResumeDeleteConfirm = () => {
		if (!resumeVersionToDelete) return;
		deleteResumeVersionMutation.mutate(resumeVersionToDelete.id);
	};

	const handleResumeRenameConfirm = () => {
		if (!resumeVersionToRename) return;
		const name = resumeVersionToRename.nextName.trim();
		if (!name) {
			setResumeVersionToRename((current) =>
				current ? { ...current, error: "Version name is required." } : current,
			);
			return;
		}
		renameResumeVersionMutation.mutate({ id: resumeVersionToRename.id, name });
	};

		return (
			<main className="space-y-4 pb-5 sm:space-y-5 sm:pb-6">
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

			<Card className="v2-panel xl:shrink-0">
				<CardHeader className="gap-3">
					<div className="min-w-0 space-y-1.5">
						<CardTitle className="text-2xl sm:text-3xl">Profile Builder</CardTitle>
						<CardDescription>
							Launch key actions and preview your outputs instantly.
						</CardDescription>
						{activeVersion || activeResumeVersion ? (
							<div className="space-y-0.5 text-xs text-muted-foreground">
								{activeVersion ? (
									<div>
										Live portfolio version:{" "}
										<span className="font-medium text-foreground">{activeVersion.name}</span>
									</div>
								) : null}
								{activeResumeVersion ? (
									<div>
										Live resume version:{" "}
										<span className="font-medium text-foreground">{activeResumeVersion.name}</span>
									</div>
								) : null}
							</div>
						) : null}
					</div>
					<CardAction className="hidden w-full flex-col items-start gap-2 lg:flex lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
						<Link
							to="/dashboard/edit"
							className={`${buttonVariants({ variant: "outline", size: "sm" })} w-auto justify-center`}
						>
							<Layers className="size-4" />
							Open portfolio builder
						</Link>
						<Link
							to="/dashboard/resume"
							className={`${buttonVariants({ variant: "outline", size: "sm" })} w-auto justify-center`}
						>
							Open resume builder
						</Link>
						<Button type="button" size="sm" className="w-auto" onClick={openCreateModal}>
							<Plus className="size-4" />
							New portfolio draft
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="w-auto"
							onClick={openResumeCreateModal}
						>
							<Plus className="size-4" />
							New resume draft
						</Button>
					</CardAction>
					<div className="flex w-full items-center justify-end gap-2 lg:hidden">
						<Button
							type="button"
							size="icon-sm"
							variant="outline"
							aria-label="Open dashboard actions"
							onClick={() => setMobileActionsOpen(true)}
						>
							<MoreHorizontal className="size-4" />
						</Button>
					</div>
				</CardHeader>
			</Card>

				<div className="grid gap-3 xl:grid-cols-2 xl:items-stretch">
					<Card className="border-border/70 shadow-none xl:h-full">
						<CardHeader className="pb-2">
							<CardTitle className="text-lg">Quick Previews</CardTitle>
							<CardDescription>
								Compact full-content miniatures. Click any tile to open full preview.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-2 pb-4 pt-0 md:flex-row md:flex-wrap md:items-start md:justify-start md:gap-2">
							{publicLink ? (
								<div
									className="w-full space-y-1.5 md:w-[288px] md:max-w-[288px]"
									role="button"
									tabIndex={0}
									aria-label="Open portfolio preview modal"
									onClick={() => setPreviewModal("portfolio")}
									onKeyDown={(event) => {
										if (event.key === "Enter" || event.key === " ") {
											event.preventDefault();
											setPreviewModal("portfolio");
										}
									}}
								>
									<div className="text-sm font-medium leading-none">Portfolio</div>
									<div
										className={`${miniPreviewViewportClassName} cursor-zoom-in bg-background`}
									>
										<div className="mx-auto" style={miniPortfolioFrameStyle}>
											<iframe
												title="Live Portfolio Preview"
												src={publicLink}
												className="pointer-events-none border-0 bg-background"
												style={{
													...miniPortfolioTransformStyle,
													width: `${miniPreviewCanvasWidth}px`,
													height: `${miniPortfolioCanvasHeight}px`,
												}}
												loading="lazy"
											/>
										</div>
									</div>
								</div>
							) : (
								<div className="w-full space-y-1.5 md:w-[288px] md:max-w-[288px]">
									<div className="text-sm font-medium leading-none">Portfolio</div>
									<div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
										Public URL is not available yet.
									</div>
								</div>
							)}

							<div
								className="w-full space-y-1.5 md:w-[288px] md:max-w-[288px]"
								role="button"
								tabIndex={0}
								aria-label="Open resume preview modal"
								onClick={() => setPreviewModal("resume")}
								onKeyDown={(event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										setPreviewModal("resume");
									}
								}}
							>
								<div className="text-sm font-medium leading-none">Resume PDF</div>
								<div
									className={`${miniPreviewViewportClassName} cursor-zoom-in bg-white`}
								>
									<div className="mx-auto" style={miniResumeFrameStyle}>
										<iframe
											title="Resume PDF Preview"
											src={resumePdfPreviewHref}
											className="pointer-events-none border-0 bg-white"
											style={{
												...miniResumeTransformStyle,
												width: `${miniPreviewCanvasWidth}px`,
												height: `${miniResumeCanvasHeight}px`,
											}}
											loading="lazy"
										/>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					<div className="grid gap-3 xl:h-full xl:min-h-0 xl:grid-rows-2">
						<Card className="flex flex-col border-border/70 shadow-none xl:h-full xl:min-h-0">
							<CardHeader>
								<div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
									<div>
										<CardTitle className="text-lg">Version timeline</CardTitle>
										<CardDescription>
											Manage versions, set live state, and keep draft iterations.
										</CardDescription>
									</div>
									<Badge variant="outline">{versionsQuery.data?.length ?? 0} total</Badge>
								</div>
							</CardHeader>
							<CardContent className="space-y-3 xl:min-h-0 xl:overflow-auto">
								{versionsQuery.data?.length ? (
									versionsQuery.data.map((version) => (
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
											<div className="mt-3 flex items-center justify-between gap-2 sm:hidden">
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
														onClick={() => activateVersionMutation.mutate(version.id)}
														disabled={activateVersionMutation.isPending}
													>
														Set live
													</Button>
												)}
												<Button
													type="button"
													size="icon-sm"
													variant="outline"
													aria-label={`Open actions for ${version.name}`}
													onClick={() => setMobileVersionActionsId(version.id)}
												>
													<MoreHorizontal className="size-4" />
												</Button>
											</div>
											<div className="mt-3 hidden gap-2 sm:mt-0 sm:flex sm:flex-wrap sm:items-center">
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
									))
								) : (
									<div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
										No versions yet. Create your first draft version to start iterating.
									</div>
								)}
							</CardContent>
						</Card>

						<Card className="flex flex-col border-border/70 shadow-none xl:h-full xl:min-h-0">
							<CardHeader>
								<div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
									<div>
										<CardTitle className="text-lg">Resume versions</CardTitle>
										<CardDescription>
											Manage resume drafts and choose what powers your live PDF.
										</CardDescription>
									</div>
									<Badge variant="outline">{resumeVersionsQuery.data?.length ?? 0} total</Badge>
								</div>
							</CardHeader>
							<CardContent className="space-y-3 xl:min-h-0 xl:overflow-auto">
								{resumeVersionsQuery.data?.length ? (
									resumeVersionsQuery.data.map((version) => (
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
											<div className="mt-3 flex items-center justify-between gap-2 sm:hidden">
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
														onClick={() =>
															activateResumeVersionMutation.mutate(version.id)
														}
														disabled={activateResumeVersionMutation.isPending}
													>
														Set live
													</Button>
												)}
												<Button
													type="button"
													size="icon-sm"
													variant="outline"
													aria-label={`Open actions for ${version.name}`}
													onClick={() => setMobileResumeVersionActionsId(version.id)}
												>
													<MoreHorizontal className="size-4" />
												</Button>
											</div>
											<div className="mt-3 hidden gap-2 sm:mt-0 sm:flex sm:flex-wrap sm:items-center">
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
														onClick={() =>
															activateResumeVersionMutation.mutate(version.id)
														}
														disabled={activateResumeVersionMutation.isPending}
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
														setResumeVersionToRename({
															id: version.id,
															name: version.name,
															nextName: version.name,
															error: "",
														})
													}
													disabled={renameResumeVersionMutation.isPending}
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
															setResumeVersionToDelete({
																id: version.id,
																name: version.name,
															})
														}
														disabled={deleteResumeVersionMutation.isPending}
													>
														<Trash2 className="size-4" />
														Delete
													</Button>
												) : null}
												<Link
													to={`/dashboard/resume?versionId=${version.id}&preview=1`}
													className={`${buttonVariants({ variant: "outline", size: "sm" })} w-full justify-center sm:w-auto`}
												>
													<Eye className="size-4" />
													Preview
												</Link>
												<Link
													to={`/dashboard/resume?versionId=${version.id}`}
													className={`${buttonVariants({ variant: "outline", size: "sm" })} w-full justify-center sm:w-auto`}
												>
													Edit
												</Link>
											</div>
										</div>
									))
								) : (
									<div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
										No resume versions yet. Create a draft to start iterating.
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</div>

			{previewModal === "portfolio" ? (
				<div className="fixed inset-0 z-50 bg-black/60 p-2 sm:p-6">
					<div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl sm:rounded-xl">
						<div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
							<div>
								<div className="text-sm font-semibold">Quick preview</div>
								<div className="text-xs text-muted-foreground">
									Live output from your current portfolio data.
								</div>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setPreviewModal(null)}
							>
								Close
							</Button>
						</div>
						<div className="h-full overflow-auto p-3 sm:p-4">
							<div className="mx-auto max-w-4xl px-2 pt-3 sm:px-4 sm:pt-6 md:pt-8">
								{portfolioQuery.data ? (
									<PortfolioView portfolio={portfolioQuery.data} />
								) : (
									<div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
										Portfolio preview is not available yet.
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			) : null}

				{previewModal === "resume" ? (
				<div className="fixed inset-0 z-50 bg-black/60 p-2 sm:p-6">
					<div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl sm:rounded-xl">
						<div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
							<div>
								<div className="text-sm font-semibold">Quick preview</div>
								<div className="text-xs text-muted-foreground">
									Live PDF output from your current resume data.
								</div>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setPreviewModal(null)}
							>
								Close
							</Button>
						</div>
						<div className="h-full overflow-auto p-3 sm:p-4">
							<div className="overflow-hidden rounded-md border">
								<iframe
									title="Resume PDF Preview Modal"
									src={resumePdfPreviewHref}
									className="h-[78dvh] min-h-[500px] w-full bg-white sm:h-[860px]"
								/>
							</div>
						</div>
					</div>
				</div>
				) : null}

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

				{resumeVersionToDelete ? (
					<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-4 sm:items-center sm:py-6">
						<Card className="flex max-h-[85vh] w-full max-w-md flex-col border-border/70 shadow-xl">
							<CardHeader>
								<CardTitle className="text-lg">Delete resume version?</CardTitle>
								<CardDescription>
									Delete "{resumeVersionToDelete.name}"? This cannot be undone.
								</CardDescription>
							</CardHeader>
							<CardContent className="min-h-0 overflow-y-auto">
								<div className="flex justify-end gap-2">
									<Button
										type="button"
										variant="outline"
										onClick={() => setResumeVersionToDelete(null)}
										disabled={deleteResumeVersionMutation.isPending}
									>
										Cancel
									</Button>
									<Button
										type="button"
										variant="destructive"
										onClick={handleResumeDeleteConfirm}
										disabled={deleteResumeVersionMutation.isPending}
									>
										{deleteResumeVersionMutation.isPending ? "Deleting..." : "Delete"}
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				) : null}

				{resumeVersionToRename ? (
					<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-4 sm:items-center sm:py-6">
						<Card className="flex max-h-[85vh] w-full max-w-md flex-col border-border/70 shadow-xl">
							<CardHeader>
								<CardTitle className="text-lg">Rename resume version</CardTitle>
								<CardDescription>
									Update the display name for "{resumeVersionToRename.name}".
								</CardDescription>
							</CardHeader>
							<CardContent className="min-h-0 space-y-3 overflow-y-auto">
								<Input
									value={resumeVersionToRename.nextName}
									onChange={(event) =>
										setResumeVersionToRename((current) =>
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
								{resumeVersionToRename.error ? (
									<div className="text-sm text-destructive">
										{resumeVersionToRename.error}
									</div>
								) : null}
								<div className="flex justify-end gap-2">
									<Button
										type="button"
										variant="outline"
										onClick={() => setResumeVersionToRename(null)}
										disabled={renameResumeVersionMutation.isPending}
									>
										Cancel
									</Button>
									<Button
										type="button"
										onClick={handleResumeRenameConfirm}
										disabled={renameResumeVersionMutation.isPending}
									>
										{renameResumeVersionMutation.isPending ? "Saving..." : "Save name"}
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

			{resumeVersionToCreate ? (
				<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-4 sm:items-center sm:py-6">
					<Card className="flex max-h-[85vh] w-full max-w-lg flex-col border-border/70 shadow-xl">
						<CardHeader>
							<CardTitle className="text-lg">Create new resume version</CardTitle>
							<CardDescription>
								Choose the base source, then set the version name.
							</CardDescription>
						</CardHeader>
						<CardContent className="min-h-0 space-y-4 overflow-y-auto">
							<div className="space-y-2">
								<div className="text-sm font-medium">Version name</div>
								<Input
									value={resumeVersionToCreate.name}
									onChange={(event) =>
										setResumeVersionToCreate((current) =>
											current
												? { ...current, name: event.target.value, error: "" }
												: current,
										)
									}
									maxLength={120}
									placeholder="e.g. PM Role Draft"
								/>
							</div>
							<div className="space-y-2">
								<div className="text-sm font-medium">Base this version on</div>
								<div className="space-y-2">
									{resumeVersionBaseOptions.map((option) => (
										<button
											key={option.value}
											type="button"
											className={cn(
												"w-full rounded-lg border px-3 py-2 text-left transition-colors",
												resumeVersionToCreate.base === option.value
													? "border-emerald-500/50 bg-emerald-500/10"
													: "border-border hover:bg-muted/40",
											)}
											onClick={() =>
												setResumeVersionToCreate((current) =>
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
							{resumeVersionToCreate.error ? (
								<div className="text-sm text-destructive">
									{resumeVersionToCreate.error}
								</div>
							) : null}
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setResumeVersionToCreate(null)}
									disabled={createResumeVersionMutation.isPending}
								>
									Cancel
								</Button>
								<Button
									type="button"
									onClick={handleResumeCreateConfirm}
									disabled={createResumeVersionMutation.isPending}
								>
									{createResumeVersionMutation.isPending ? "Creating..." : "Create version"}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			) : null}

			<Sheet open={mobileActionsOpen} onOpenChange={setMobileActionsOpen}>
				<SheetContent side="bottom" className="rounded-t-2xl p-0 lg:hidden">
					<SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
						<SheetTitle>Dashboard actions</SheetTitle>
					</SheetHeader>
					<div className="space-y-2 px-4 py-4">
						<Button
							type="button"
							variant="outline"
							className="w-full justify-start"
							onClick={() => {
								setMobileActionsOpen(false);
								openCreateModal();
							}}
						>
							<Plus className="size-4" />
							New portfolio draft
						</Button>
						<Link
							to="/dashboard/edit"
							className={`${buttonVariants({ variant: "outline" })} w-full justify-start`}
						>
							<Layers className="size-4" />
							Open portfolio builder
						</Link>
						<Link
							to="/dashboard/resume"
							className={`${buttonVariants({ variant: "outline" })} w-full justify-start`}
						>
							Open resume builder
						</Link>
						<Button
							type="button"
							variant="outline"
							className="w-full justify-start"
							onClick={() => {
								setMobileActionsOpen(false);
								openResumeCreateModal();
							}}
						>
							<Plus className="size-4" />
							New resume draft
						</Button>
					</div>
				</SheetContent>
			</Sheet>

			<Sheet
				open={Boolean(selectedMobileVersion)}
				onOpenChange={(open) => {
					if (!open) setMobileVersionActionsId(null);
				}}
			>
				<SheetContent side="bottom" className="rounded-t-2xl p-0 sm:hidden">
					<SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
						<SheetTitle>{selectedMobileVersion?.name ?? "Version actions"}</SheetTitle>
					</SheetHeader>
					<div className="space-y-2 px-4 py-4">
						{selectedMobileVersion && !selectedMobileVersion.isActive ? (
							<Button
								type="button"
								variant="outline"
								className="w-full justify-start"
								onClick={() => {
									activateVersionMutation.mutate(selectedMobileVersion.id);
									setMobileVersionActionsId(null);
								}}
								disabled={activateVersionMutation.isPending}
							>
								Set live
							</Button>
						) : null}
						{selectedMobileVersion ? (
							<Button
								type="button"
								variant="outline"
								className="w-full justify-start"
								onClick={() => {
									setVersionToRename({
										id: selectedMobileVersion.id,
										name: selectedMobileVersion.name,
										nextName: selectedMobileVersion.name,
										error: "",
									});
									setMobileVersionActionsId(null);
								}}
								disabled={renameVersionMutation.isPending}
							>
								<Pencil className="size-4" />
								Rename
							</Button>
						) : null}
						{selectedMobileVersion && !selectedMobileVersion.isActive ? (
							<Button
								type="button"
								variant="outline"
								className="w-full justify-start text-destructive hover:text-destructive"
								onClick={() => {
									setVersionToDelete({
										id: selectedMobileVersion.id,
										name: selectedMobileVersion.name,
									});
									setMobileVersionActionsId(null);
								}}
								disabled={deleteVersionMutation.isPending}
							>
								<Trash2 className="size-4" />
								Delete
							</Button>
						) : null}
						{selectedMobileVersion ? (
							<Link
								to={`/dashboard/edit?versionId=${selectedMobileVersion.id}&preview=1`}
								className={`${buttonVariants({ variant: "outline" })} w-full justify-start`}
								onClick={() => setMobileVersionActionsId(null)}
							>
								<Eye className="size-4" />
								Preview
							</Link>
						) : null}
						{selectedMobileVersion ? (
							<Link
								to={`/dashboard/edit?versionId=${selectedMobileVersion.id}`}
								className={`${buttonVariants({ variant: "outline" })} w-full justify-start`}
								onClick={() => setMobileVersionActionsId(null)}
							>
								Edit
							</Link>
						) : null}
					</div>
				</SheetContent>
			</Sheet>

			<Sheet
				open={Boolean(selectedMobileResumeVersion)}
				onOpenChange={(open) => {
					if (!open) setMobileResumeVersionActionsId(null);
				}}
			>
				<SheetContent side="bottom" className="rounded-t-2xl p-0 sm:hidden">
					<SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
						<SheetTitle>
							{selectedMobileResumeVersion?.name ?? "Resume version actions"}
						</SheetTitle>
					</SheetHeader>
					<div className="space-y-2 px-4 py-4">
						{selectedMobileResumeVersion && !selectedMobileResumeVersion.isActive ? (
							<Button
								type="button"
								variant="outline"
								className="w-full justify-start"
								onClick={() => {
									activateResumeVersionMutation.mutate(selectedMobileResumeVersion.id);
									setMobileResumeVersionActionsId(null);
								}}
								disabled={activateResumeVersionMutation.isPending}
							>
								Set live
							</Button>
						) : null}
						{selectedMobileResumeVersion ? (
							<Button
								type="button"
								variant="outline"
								className="w-full justify-start"
								onClick={() => {
									setResumeVersionToRename({
										id: selectedMobileResumeVersion.id,
										name: selectedMobileResumeVersion.name,
										nextName: selectedMobileResumeVersion.name,
										error: "",
									});
									setMobileResumeVersionActionsId(null);
								}}
								disabled={renameResumeVersionMutation.isPending}
							>
								<Pencil className="size-4" />
								Rename
							</Button>
						) : null}
						{selectedMobileResumeVersion && !selectedMobileResumeVersion.isActive ? (
							<Button
								type="button"
								variant="outline"
								className="w-full justify-start text-destructive hover:text-destructive"
								onClick={() => {
									setResumeVersionToDelete({
										id: selectedMobileResumeVersion.id,
										name: selectedMobileResumeVersion.name,
									});
									setMobileResumeVersionActionsId(null);
								}}
								disabled={deleteResumeVersionMutation.isPending}
							>
								<Trash2 className="size-4" />
								Delete
							</Button>
						) : null}
						{selectedMobileResumeVersion ? (
							<Link
								to={`/dashboard/resume?versionId=${selectedMobileResumeVersion.id}&preview=1`}
								className={`${buttonVariants({ variant: "outline" })} w-full justify-start`}
								onClick={() => setMobileResumeVersionActionsId(null)}
							>
								<Eye className="size-4" />
								Preview
							</Link>
						) : null}
						{selectedMobileResumeVersion ? (
							<Link
								to={`/dashboard/resume?versionId=${selectedMobileResumeVersion.id}`}
								className={`${buttonVariants({ variant: "outline" })} w-full justify-start`}
								onClick={() => setMobileResumeVersionActionsId(null)}
							>
								Edit
							</Link>
						) : null}
					</div>
				</SheetContent>
			</Sheet>
		</main>
	);
}
