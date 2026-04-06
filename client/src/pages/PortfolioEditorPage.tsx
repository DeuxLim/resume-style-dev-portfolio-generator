import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/axios.client";
import type { AxiosError } from "axios";
import { sessionQueryKey, useSession } from "@/hooks/useSession";
import {
	cloneEditablePortfolio,
	createCustomSection,
	createExperienceItem,
	createHeaderAction,
	createProjectItem,
	createTechCategory,
	createTimelineItem,
} from "@/lib/portfolio";
import {
	findTechCategoryPresetKeyByName,
	getTechCategoryPresetByKey,
	getTechCategoryPresets,
	getSuggestedTechForCategory,
	getTechIcon,
	normalizeTechName,
	searchTechOptions,
} from "@/lib/tech";
import type {
	EditablePortfolio,
	HeaderAction,
	HeaderActionType,
	PortfolioVersionBase,
	PortfolioVersionDetail,
	PortfolioVersionSummary,
} from "../../../shared/types/portfolio.types";
import type { TechCategoryPresetKey } from "@/lib/tech";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
	ChevronDown,
	ChevronUp,
	Eye,
	Layers3,
	Pencil,
	Save,
	Trash2,
	X,
} from "lucide-react";
import GridLayout, {
	type Layout as GridLayoutModel,
	type LayoutItem as GridLayoutItem,
} from "react-grid-layout";
import { getAvatarUrl, resolveAssetUrl } from "@/lib/assets";
import {
	getVisibleHiddenSections,
	getVisibleSectionOrder,
} from "@/lib/portfolioLayout";
import { defaultPortfolioLayout } from "../../../shared/defaults/portfolio";
import type {
	CustomSection,
	PortfolioSectionKey,
	PortfolioSectionSpan,
} from "../../../shared/types/portfolio.types";
import About from "@/components/Home/About";
import Timeline from "@/components/Home/Timeline";
import Experience from "@/components/Home/Experience";
import TechStack from "@/components/Home/TechStack";
import Projects from "@/components/Home/Projects";
import Heatmap from "@/components/Home/Heatmap";
import PortfolioView from "@/components/portfolio/PortfolioView";

const SECTION_META: Record<
	PortfolioSectionKey,
	{ title: string; description: string }
> = {
	about: {
		title: "About",
		description: "Personal summary and introduction.",
	},
	timeline: {
		title: "Timeline",
		description: "Career and education milestones.",
	},
	experience: {
		title: "Experience",
		description: "Role history and impact highlights.",
	},
	tech: {
		title: "Tech Stack",
		description: "Grouped tools and technologies.",
	},
	projects: {
		title: "Projects",
		description: "Portfolio project showcase.",
	},
	heatmap: {
		title: "Coding Heatmap",
		description: "GitHub contribution graph section.",
	},
	custom: {
		title: "Custom Sections",
		description: "Any extra blocks added by user.",
	},
};

const GRID_COLS = 12;
const GRID_ALLOWED_SPANS: PortfolioSectionSpan[] = [4, 6, 8, 12];
const GRID_MIN_HEIGHT = 4;
const GRID_MAX_HEIGHT = 48;
const MAX_CUSTOM_SECTIONS = 8;
const MAX_HEADER_ACTIONS = 4;
type CreateModalKind =
	| "header-action"
	| "timeline"
	| "experience"
	| "tech-category"
	| "project"
	| "custom-section"
	| "custom-bullet"
	| "custom-link"
	| "tech-item";

type CreateModalState = {
	kind: CreateModalKind;
	title: string;
	description: string;
	sectionId?: string;
	customSectionType?: CustomSection["type"];
};

const HEADER_ACTION_LABELS: Record<Exclude<HeaderActionType, "link">, string> = {
	github: "Github",
	linkedin: "LinkedIn",
	email: "Email",
	phone: "Phone",
};

export default function PortfolioEditorPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const queryClient = useQueryClient();
	const sessionQuery = useSession();
	const selectedVersionId = Number(searchParams.get("versionId"));
	const hasSelectedVersionId =
		Number.isFinite(selectedVersionId) && selectedVersionId > 0;
	const draftMode = searchParams.get("draft") === "1" && !hasSelectedVersionId;
	const draftBaseInput = String(searchParams.get("base") ?? "latest").toLowerCase();
	const draftBase: PortfolioVersionBase =
		draftBaseInput === "blank" || draftBaseInput === "live" || draftBaseInput === "latest"
			? draftBaseInput
			: "latest";
	const draftName = String(searchParams.get("name") ?? "").trim();
	const [portfolio, setPortfolio] = useState<EditablePortfolio | null>(null);
	const [toast, setToast] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);
	const [quickTechInput, setQuickTechInput] = useState<Record<string, string>>({});
	const [layoutFeedback, setLayoutFeedback] = useState("");
	const [draggingSection, setDraggingSection] = useState<PortfolioSectionKey | null>(null);
	const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});
	const [pendingFocusExperienceId, setPendingFocusExperienceId] = useState<string | null>(
		null,
	);
	const [isCustomSectionEditorOpen, setIsCustomSectionEditorOpen] = useState(false);
	const [isHeaderActionsEditorOpen, setIsHeaderActionsEditorOpen] = useState(false);
	const [layoutWidth, setLayoutWidth] = useState(0);
	const [canvasLayout, setCanvasLayout] = useState<GridLayoutModel>([]);
	const [activeTab, setActiveTab] = useState("profile");
	const [previewOpen, setPreviewOpen] = useState(false);
	const [renameDialogOpen, setRenameDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [renameValue, setRenameValue] = useState("");
	const [pendingAutoFit, setPendingAutoFit] = useState(false);
	const [aboutMarkdownValue, setAboutMarkdownValue] = useState("");
	const [aboutMarkdownView, setAboutMarkdownView] = useState<"write" | "preview">(
		"write",
	);
	const [avatarInputMode, setAvatarInputMode] = useState<"upload" | "link">(
		"upload",
	);
	const [coverInputMode, setCoverInputMode] = useState<"upload" | "link">(
		"upload",
	);
	const [createModal, setCreateModal] = useState<CreateModalState | null>(null);
	const [createForm, setCreateForm] = useState<Record<string, string>>({});
	const [categoryPresetOverrides, setCategoryPresetOverrides] = useState<
		Record<string, TechCategoryPresetKey | "custom">
	>({});
	const techCategoryPresets = useMemo(() => getTechCategoryPresets(), []);
	const layoutContainerRef = useRef<HTMLDivElement | null>(null);
	const sectionContentRefs = useRef<
		Partial<Record<PortfolioSectionKey, HTMLDivElement | null>>
	>(
		{},
	);
	const experienceItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const hasAutoFitOnLayoutOpen = useRef(false);
	const avatarInputRef = useRef<HTMLInputElement | null>(null);
	const coverInputRef = useRef<HTMLInputElement | null>(null);

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

	const versionDetailQuery = useQuery({
		queryKey: ["my-portfolio-version", selectedVersionId],
		queryFn: async () => {
			const { data } = await api.get<PortfolioVersionDetail>(
				`/portfolios/me/versions/${selectedVersionId}`,
			);
			return data;
		},
		enabled: Boolean(sessionQuery.data?.user) && hasSelectedVersionId,
	});

	const versionPreviewQuery = useQuery({
		queryKey: ["my-portfolio-version-preview", draftBase],
		queryFn: async () => {
			const { data } = await api.get<{ portfolio: EditablePortfolio }>(
				`/portfolios/me/versions/preview?base=${draftBase}`,
			);
			return data.portfolio;
		},
		enabled: Boolean(sessionQuery.data?.user) && draftMode,
	});

	useEffect(() => {
		if (sessionQuery.isSuccess && !sessionQuery.data?.user) {
			navigate("/login");
		}
	}, [navigate, sessionQuery.data, sessionQuery.isSuccess]);

	useEffect(() => {
		if (!toast) return;
		const timeoutId = window.setTimeout(() => setToast(null), 2400);
		return () => window.clearTimeout(timeoutId);
	}, [toast]);

	useEffect(() => {
		if (!versionDetailQuery.data?.version?.name) return;
		setRenameValue(versionDetailQuery.data.version.name);
	}, [versionDetailQuery.data?.version?.name]);

	useEffect(() => {
		if (!portfolio) return;
		setAboutMarkdownValue(portfolio.about.join("\n\n"));
	}, [portfolio]);

	useEffect(() => {
		if (!portfolio) return;
		const avatar = String(portfolio.avatarUrl ?? "").trim();
		const cover = String(portfolio.coverUrl ?? "").trim();
		const avatarIsLink =
			Boolean(avatar) &&
			avatar !== "/default-avatar.svg" &&
			!avatar.includes("/uploads/avatars/");
		const coverIsLink =
			Boolean(cover) &&
			cover !== "/default-cover.svg" &&
			!cover.includes("/uploads/covers/");
		setAvatarInputMode(avatarIsLink ? "link" : "upload");
		setCoverInputMode(coverIsLink ? "link" : "upload");
	}, [portfolio]);

	useEffect(() => {
		if (hasSelectedVersionId) {
			if (!versionDetailQuery.data) {
				setPortfolio(null);
				return;
			}
			setPortfolio(cloneEditablePortfolio(versionDetailQuery.data.portfolio));
			return;
		}
		if (draftMode) {
			if (!versionPreviewQuery.data) {
				setPortfolio(null);
				return;
			}
			setPortfolio(cloneEditablePortfolio(versionPreviewQuery.data));
			return;
		}
		if (!portfolioQuery.data) return;
		setPortfolio(cloneEditablePortfolio(portfolioQuery.data));
	}, [
		draftMode,
		hasSelectedVersionId,
		portfolioQuery.data,
		selectedVersionId,
		versionDetailQuery.data,
		versionPreviewQuery.data,
	]);

	useEffect(() => {
		if (!hasSelectedVersionId || !versionDetailQuery.isError) return;
		setToast({
			type: "error",
			message: "Selected version was not found. Redirected to live editor.",
		});
		navigate("/dashboard/edit", { replace: true });
	}, [hasSelectedVersionId, navigate, versionDetailQuery.isError]);

	useEffect(() => {
		if (activeTab !== "layout") return;
		const container = layoutContainerRef.current;
		if (!container) return;

		const updateWidth = () => {
			setLayoutWidth(Math.max(0, Math.floor(container.clientWidth)));
		};

		updateWidth();
		const rafId = requestAnimationFrame(updateWidth);
		const timeoutId = setTimeout(updateWidth, 120);
		const observer = new ResizeObserver(updateWidth);
		observer.observe(container);

		return () => {
			cancelAnimationFrame(rafId);
			clearTimeout(timeoutId);
			observer.disconnect();
		};
	}, [activeTab]);

	const toGridRowsFromPixels = (pixelHeight: number) =>
		Math.ceil(pixelHeight / (26 + 12));

	const buildRowNormalizedHeights = (
		order: PortfolioSectionKey[],
		spans: Record<PortfolioSectionKey, PortfolioSectionSpan>,
		heights: Record<PortfolioSectionKey, number>,
	): Record<PortfolioSectionKey, number> => {
		const normalized = { ...heights };
		let cursorX = 0;
		let rowSections: PortfolioSectionKey[] = [];
		let rowMax = GRID_MIN_HEIGHT;

		const flushRow = () => {
			for (const section of rowSections) {
				normalized[section] = rowMax;
			}
		};

		for (const section of order) {
			const span = spans[section];
			if (cursorX + span > GRID_COLS) {
				flushRow();
				rowSections = [];
				rowMax = GRID_MIN_HEIGHT;
				cursorX = 0;
			}

			rowSections.push(section);
			rowMax = Math.max(rowMax, heights[section]);
			cursorX += span;
		}

		flushRow();
		return normalized;
	};

	const autoFitCanvasHeights = () => {
		setPortfolio((current) => {
			if (!current) return current;

			const order = getLayoutOrder(current);
			const spans = resolveSectionSpanRecord(current);
			const currentHeights = resolveSectionHeightRecord(current);
			const measuredHeights = { ...currentHeights };

			for (const section of order) {
				const contentNode = sectionContentRefs.current[section];
				if (!contentNode) continue;
				const overflowPx = Math.max(
					0,
					contentNode.scrollHeight - contentNode.clientHeight,
				);
				if (overflowPx <= 0) continue;
				const additionalRows = toGridRowsFromPixels(overflowPx + 8);
				measuredHeights[section] = clampSectionHeight(
					currentHeights[section] + additionalRows,
				);
			}

			const normalizedHeights = buildRowNormalizedHeights(
				order,
				spans,
				measuredHeights,
			);

			return {
				...current,
				layout: {
					...current.layout,
					sectionHeights: normalizedHeights,
				},
			};
		});
	};

	useEffect(() => {
		if (!pendingAutoFit || activeTab !== "layout") return;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		let timeoutId2: ReturnType<typeof setTimeout> | null = null;
		const rafId = requestAnimationFrame(() => {
			autoFitCanvasHeights();
			timeoutId = setTimeout(() => autoFitCanvasHeights(), 80);
			timeoutId2 = setTimeout(() => autoFitCanvasHeights(), 220);
			setPendingAutoFit(false);
		});
		return () => {
			cancelAnimationFrame(rafId);
			if (timeoutId) clearTimeout(timeoutId);
			if (timeoutId2) clearTimeout(timeoutId2);
		};
	}, [activeTab, pendingAutoFit]);

	useEffect(() => {
		if (activeTab !== "layout") {
			hasAutoFitOnLayoutOpen.current = false;
			return;
		}
		if (!portfolio) return;
		if (hasAutoFitOnLayoutOpen.current) return;
		hasAutoFitOnLayoutOpen.current = true;
		setPendingAutoFit(true);
	}, [activeTab, portfolio]);

	const saveMutation = useMutation({
		mutationFn: async () => {
			if (!portfolio) {
				throw new Error("Portfolio data is not ready.");
			}

			if (draftMode) {
				if (!draftName) {
					throw new Error("Version name is required.");
				}
				const created = await api.post<{ version: PortfolioVersionSummary }>(
					"/portfolios/me/versions",
					{ name: draftName, base: draftBase, portfolio },
				);
				const createdVersionId = created.data.version.id;
				const { data } = await api.get<PortfolioVersionDetail>(
					`/portfolios/me/versions/${createdVersionId}`,
				);
				return {
					portfolio: data.portfolio,
					savedDraft: true,
					createdVersionId,
				};
			}

			if (
				hasSelectedVersionId &&
				versionDetailQuery.data?.version &&
				!versionDetailQuery.data.version.isActive
			) {
				const { data } = await api.put<PortfolioVersionDetail>(
					`/portfolios/me/versions/${selectedVersionId}/snapshot`,
					{ portfolio },
				);
				return {
					portfolio: data.portfolio,
					savedDraft: true,
					createdVersionId: null as number | null,
				};
			}

			const { data } = await api.put<{ portfolio: EditablePortfolio }>(
				"/portfolios/me",
				{ portfolio },
			);
			return {
				portfolio: data.portfolio,
				savedDraft: false,
				createdVersionId: null as number | null,
			};
		},
		onSuccess: async (result) => {
			setToast({
				type: "success",
				message: result.savedDraft
					? "Saved. Draft version updated."
					: "Saved. Your live portfolio is updated.",
			});

			setPortfolio(cloneEditablePortfolio(result.portfolio));
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio"] });
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio-versions"] });
			if (result.createdVersionId) {
				navigate(`/dashboard/edit?versionId=${result.createdVersionId}`, {
					replace: true,
				});
				await queryClient.invalidateQueries({
					queryKey: ["my-portfolio-version", result.createdVersionId],
				});
				return;
			}
			if (hasSelectedVersionId) {
				await queryClient.invalidateQueries({
					queryKey: ["my-portfolio-version", selectedVersionId],
				});
			}
		},
		onError: (error) => {
			const responseData = (error as AxiosError<{ message?: string }>).response
				?.data;
			const fallback =
				error instanceof Error && error.message
					? error.message
					: "Save failed. Please try again.";
			setToast({
				type: "error",
				message: responseData?.message ?? fallback,
			});
		},
	});

	const renameVersionMutation = useMutation({
		mutationFn: async (nextName: string) => {
			const versionId = hasSelectedVersionId
				? selectedVersionId
				: activeVersion?.id;
			if (!versionId) throw new Error("Version not found.");
			return api.put(`/portfolios/me/versions/${versionId}`, { name: nextName });
		},
		onSuccess: async () => {
			setToast({ type: "success", message: "Version renamed." });
			setRenameDialogOpen(false);
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio-versions"] });
			if (hasSelectedVersionId) {
				await queryClient.invalidateQueries({
					queryKey: ["my-portfolio-version", selectedVersionId],
				});
			}
		},
		onError: () => {
			setToast({ type: "error", message: "Failed to rename version." });
		},
	});

	const activateVersionMutation = useMutation({
		mutationFn: async (versionId: number) =>
			api.put(`/portfolios/me/versions/${versionId}/activate`),
		onSuccess: async () => {
			setToast({ type: "success", message: "Version is now live." });
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio"] });
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio-versions"] });
			if (hasSelectedVersionId) {
				await queryClient.invalidateQueries({
					queryKey: ["my-portfolio-version", selectedVersionId],
				});
			}
		},
		onError: () => {
			setToast({ type: "error", message: "Failed to set this version live." });
		},
	});

	const deleteVersionMutation = useMutation({
		mutationFn: async () => {
			const versionId = hasSelectedVersionId
				? selectedVersionId
				: activeVersion?.id;
			if (!versionId) throw new Error("Version not found.");
			return api.delete(`/portfolios/me/versions/${versionId}`);
		},
		onSuccess: async () => {
			setToast({ type: "success", message: "Version deleted." });
			setDeleteDialogOpen(false);
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio-versions"] });
			navigate("/dashboard");
		},
		onError: () => {
			setToast({ type: "error", message: "Failed to delete version." });
		},
	});

	const uploadAvatarMutation = useMutation({
		mutationFn: async (file: File) => {
			const formData = new FormData();
			formData.append("avatar", file);
			formData.append("previousAvatarUrl", portfolio?.avatarUrl ?? "");
			const { data } = await api.post<{
				avatarUrl: string;
				portfolio: EditablePortfolio;
			}>("/portfolios/me/avatar", formData);
			return data;
		},
		onSuccess: async (data) => {
			setToast({ type: "success", message: "Profile photo uploaded." });
			setPortfolio(cloneEditablePortfolio(data.portfolio));
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio"] });
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
		},
		onError: () => {
			setToast({
				type: "error",
				message: "Upload failed. Please use JPG, PNG, WEBP, or GIF under 3MB.",
			});
		},
	});

	const uploadCoverMutation = useMutation({
		mutationFn: async (file: File) => {
			const formData = new FormData();
			formData.append("cover", file);
			formData.append("previousCoverUrl", portfolio?.coverUrl ?? "");
			const { data } = await api.post<{
				coverUrl: string;
				portfolio: EditablePortfolio;
			}>("/portfolios/me/cover", formData);
			return data;
		},
		onSuccess: async (data) => {
			setToast({ type: "success", message: "Cover image uploaded." });
			setPortfolio(cloneEditablePortfolio(data.portfolio));
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio"] });
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
		},
		onError: () => {
			setToast({
				type: "error",
				message: "Upload failed. Please use JPG, PNG, WEBP, or GIF under 5MB.",
			});
		},
	});

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const isSaveKey =
				(event.ctrlKey || event.metaKey) &&
				event.key.toLowerCase() === "s" &&
				!event.altKey;
			if (!isSaveKey) return;
			event.preventDefault();
			if (!portfolio || saveMutation.isPending) return;
			saveMutation.mutate();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [portfolio, saveMutation]);

	const setBasicField = (
		key:
			| "fullName"
			| "headline"
			| "location"
			| "experienceSummary"
			| "education"
			| "availability"
			| "email"
			| "phone"
			| "avatarUrl"
			| "coverUrl"
			| "githubUrl"
			| "githubUsername"
			| "linkedinUrl",
		value: string,
	) => {
		setPortfolio((current) => (current ? { ...current, [key]: value } : current));
	};

	const setHeaderActionField = (
		actionId: string,
		key: keyof Pick<HeaderAction, "label" | "type" | "value" | "display">,
		value: string,
	) => {
		setPortfolio((current) => {
			if (!current) return current;
			return {
				...current,
				headerActions: current.headerActions.map((action) =>
					action.id === actionId
						? {
								...action,
								[key]:
									key === "type"
										? (value as HeaderActionType)
										: key === "display"
											? value === "value"
												? "value"
												: "label"
											: value,
							}
						: action,
				),
			};
		});
	};

	const setHeaderActionType = (actionId: string, type: HeaderActionType) => {
		setPortfolio((current) => {
			if (!current) return current;
			return {
				...current,
				headerActions: current.headerActions.map((action) => {
					if (action.id !== actionId) return action;
					const nextLabel =
						type === "link"
							? action.label
							: HEADER_ACTION_LABELS[type as Exclude<HeaderActionType, "link">];
					return {
						...action,
						type,
						label: nextLabel,
						value: action.value,
						display: action.display,
					};
				}),
			};
		});
	};

	const removeHeaderAction = (actionId: string) => {
		setPortfolio((current) => {
			if (!current) return current;
			return {
				...current,
				headerActions: current.headerActions.filter((action) => action.id !== actionId),
			};
		});
	};

	const renderHeaderActionsEditor = () => (
		<div className="space-y-3">
			<div className="overflow-x-auto rounded-md border bg-background/70">
				<div className="min-w-[920px]">
					<div className="grid grid-cols-[140px_minmax(260px,1fr)_170px_170px_100px] gap-2 border-b px-3 py-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
						<div>Type</div>
						<div>Value</div>
						<div>Display</div>
						<div>Label</div>
						<div className="text-right">Action</div>
					</div>
					{portfolio?.headerActions.map((action) => (
						<div
							key={action.id}
							className="grid grid-cols-[140px_minmax(260px,1fr)_170px_170px_100px] items-center gap-2 border-b px-3 py-2 last:border-b-0"
						>
							<select
								className="border-input bg-background ring-offset-background h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
								value={action.type}
								onChange={(event) =>
									setHeaderActionType(
										action.id,
										event.target.value as HeaderActionType,
									)
								}
							>
								<option value="github">Github</option>
								<option value="linkedin">LinkedIn</option>
								<option value="email">Email</option>
								<option value="phone">Phone</option>
								<option value="link">Custom link</option>
							</select>
							<Input
								value={action.value}
								onChange={(event) =>
									setHeaderActionField(
										action.id,
										"value",
										event.target.value,
									)
								}
								placeholder={
									action.type === "email"
										? "name@example.com"
										: action.type === "phone"
											? "+63..."
											: "https://..."
								}
							/>
							<select
								className="border-input bg-background ring-offset-background h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
								value={action.display === "value" ? "value" : "label"}
								onChange={(event) =>
									setHeaderActionField(
										action.id,
										"display",
										event.target.value,
									)
								}
							>
								<option value="label">Use label</option>
								<option value="value">Use actual value</option>
							</select>
							<Input
								value={action.label}
								onChange={(event) =>
									setHeaderActionField(
										action.id,
										"label",
										event.target.value,
									)
								}
								placeholder="Label"
							/>
							<div className="flex justify-end">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => removeHeaderAction(action.id)}
								>
									Remove
								</Button>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);

	const addTechToCategory = (categoryId: string, techName: string) => {
		setPortfolio((current) =>
			current
				? {
						...current,
						techCategories: current.techCategories.map((entry) => {
							if (entry.id !== categoryId) return entry;
							const hasTech = entry.items.some(
								(item) => normalizeTechName(item) === normalizeTechName(techName),
							);
							return hasTech
								? entry
								: { ...entry, items: [...entry.items, techName] };
						}),
					}
				: current,
		);
	};

	const removeTechFromCategory = (categoryId: string, techName: string) => {
		setPortfolio((current) =>
			current
				? {
						...current,
						techCategories: current.techCategories.map((entry) =>
							entry.id === categoryId
								? {
										...entry,
										items: entry.items.filter(
											(item) =>
												normalizeTechName(item) !== normalizeTechName(techName),
										),
									}
								: entry,
						),
					}
				: current,
		);
	};

	const togglePanel = (panelId: string) => {
		setOpenPanels((current) => ({ ...current, [panelId]: !current[panelId] }));
	};

	const parseTechItems = (value: string) =>
		value
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);

	const getCategoryPresetKey = (
		categoryId: string,
		categoryName: string,
	): TechCategoryPresetKey | "" => {
		const override = categoryPresetOverrides[categoryId];
		if (override === "custom") return "";
		if (override) return override;
		return findTechCategoryPresetKeyByName(categoryName) ?? "";
	};

	const setCreateFormTechItems = (items: string[]) => {
		setCreateForm((current) => ({
			...current,
			items: items.join(", "),
		}));
	};

	const addCreateFormTechItem = (techName: string) => {
		const next = techName.trim();
		if (!next) return;
		const items = parseTechItems(createForm.items ?? "");
		const exists = items.some(
			(item) => normalizeTechName(item) === normalizeTechName(next),
		);
		if (exists) return;
		setCreateFormTechItems([...items, next]);
	};

	const removeCreateFormTechItem = (techName: string) => {
		const items = parseTechItems(createForm.items ?? "");
		setCreateFormTechItems(
			items.filter(
				(item) => normalizeTechName(item) !== normalizeTechName(techName),
			),
		);
	};

	const applyPresetToCategory = (categoryId: string, presetKey: string) => {
		if (!presetKey) {
			setCategoryPresetOverrides((current) => ({
				...current,
				[categoryId]: "custom",
			}));
			return;
		}
		const preset = getTechCategoryPresetByKey(presetKey as TechCategoryPresetKey);
		if (!preset) return;
		setCategoryPresetOverrides((current) => ({
			...current,
			[categoryId]: preset.key,
		}));
		setPortfolio((current) =>
			current
				? {
						...current,
						techCategories: current.techCategories.map((entry) =>
							entry.id === categoryId
								? {
										...entry,
										name: preset.label,
									}
								: entry,
						),
					}
				: current,
		);
	};

	const getHeaderActionCreateDefaults = (
		type: HeaderActionType,
	): Record<string, string> => ({
		type,
		label: type === "link" ? "Custom link" : HEADER_ACTION_LABELS[type],
		value: "",
		display: "label",
	});

	const openCreateModal = (state: CreateModalState, defaults: Record<string, string> = {}) => {
		setCreateModal(state);
		setCreateForm(defaults);
	};

	const submitCreateModal = () => {
		if (!createModal) return;
		if (!portfolio) return;

		switch (createModal.kind) {
			case "header-action": {
				if (portfolio.headerActions.length >= MAX_HEADER_ACTIONS) {
					setToast({
						type: "error",
						message: `Maximum ${MAX_HEADER_ACTIONS} header actions reached.`,
					});
					break;
				}
				const type = (createForm.type || "github") as HeaderActionType;
				const nextValue = String(createForm.value ?? "").trim();
				if (!nextValue) {
					setToast({
						type: "error",
						message: "Header action value is required.",
					});
					return;
				}
				const action = createHeaderAction();
				action.type = type;
				action.label =
					createForm.label?.trim() ||
					(type === "link" ? "Custom link" : HEADER_ACTION_LABELS[type]);
				action.value = nextValue;
				action.display = createForm.display === "value" ? "value" : "label";
				setPortfolio((current) =>
					current
						? { ...current, headerActions: [...current.headerActions, action] }
						: current,
				);
				setToast({ type: "success", message: "Header action created." });
				break;
			}
			case "timeline": {
				const item = createTimelineItem();
				item.year = createForm.year?.trim() || "";
				item.position = createForm.position?.trim() || "";
				item.company = createForm.company?.trim() || "";
				item.note = createForm.note?.trim() || "";
				setPortfolio((current) =>
					current ? { ...current, timeline: [...current.timeline, item] } : current,
				);
				setOpenPanels((current) => ({ ...current, [`timeline-${item.id}`]: true }));
				setToast({ type: "success", message: "Timeline item created." });
				break;
			}
			case "experience": {
				const item = createExperienceItem();
				item.role = createForm.role?.trim() || "";
				item.company = createForm.company?.trim() || "";
				item.period = createForm.period?.trim() || "";
				item.highlights = (createForm.highlights || "")
					.split("\n")
					.map((value) => value.trim())
					.filter(Boolean);
				setPortfolio((current) =>
					current
						? { ...current, experiences: [...current.experiences, item] }
						: current,
				);
				setOpenPanels((current) => ({ ...current, [`experience-${item.id}`]: true }));
				setPendingFocusExperienceId(item.id);
				setToast({ type: "success", message: "Experience role created." });
				break;
			}
			case "tech-category": {
				const category = createTechCategory();
				const presetKey =
					(createForm.presetKey as TechCategoryPresetKey | undefined) ?? undefined;
				const preset =
					(createForm.categoryMode ?? "preset") === "preset" && presetKey
						? getTechCategoryPresetByKey(presetKey)
						: undefined;
				category.name = createForm.name?.trim() || preset?.label || "";
				category.items = (createForm.items || "")
					.split(",")
					.map((value) => value.trim())
					.filter(Boolean);
				setPortfolio((current) =>
					current
						? { ...current, techCategories: [...current.techCategories, category] }
						: current,
				);
				setOpenPanels((current) => ({ ...current, [`tech-${category.id}`]: true }));
				setToast({ type: "success", message: "Tech category created." });
				break;
			}
			case "project": {
				const project = createProjectItem();
				project.name = createForm.name?.trim() || "";
				project.description = createForm.description?.trim() || "";
				project.url = createForm.url?.trim() || "";
				setPortfolio((current) =>
					current ? { ...current, projects: [...current.projects, project] } : current,
				);
				setOpenPanels((current) => ({ ...current, [`project-${project.id}`]: true }));
				setToast({ type: "success", message: "Project created." });
				break;
			}
			case "custom-section": {
				if (portfolio.customSections.length >= MAX_CUSTOM_SECTIONS) {
					setLayoutFeedback(`Custom sections limit reached (${MAX_CUSTOM_SECTIONS}).`);
					break;
				}
				const section = createCustomSection();
				const type = createModal.customSectionType ?? "text";
				section.type = type;
				section.title = createForm.title?.trim() || "";
				section.body = type === "text" ? createForm.body ?? "" : "";
				section.items =
					type === "bullets"
						? (createForm.items || "")
								.split("\n")
								.map((value) => value.trim())
								.filter(Boolean)
						: [];
				section.links =
					type === "links"
						? [
								{
									id: `${Date.now()}-link`,
									label: createForm.label?.trim() || "",
									url: createForm.url?.trim() || "",
								},
							]
						: [];
				const hasCustom = getLayoutOrder(portfolio).includes("custom");
				setPortfolio((current) =>
					current
						? {
								...current,
								customSections: [...current.customSections, section],
								layout: {
									...current.layout,
									sectionOrder: hasCustom
										? getLayoutOrder(current)
										: [...getLayoutOrder(current), "custom"],
								},
							}
						: current,
				);
				setOpenPanels((current) => ({ ...current, [`custom-${section.id}`]: true }));
				setPendingAutoFit(true);
				setLayoutFeedback("Created a custom section.");
				break;
			}
			case "custom-bullet": {
				if (!createModal.sectionId) break;
				const bullet = createForm.bullet?.trim() || "";
				if (!bullet) {
					setToast({ type: "error", message: "Bullet text is required." });
					return;
				}
				setPortfolio((current) =>
					current
						? {
								...current,
								customSections: current.customSections.map((entry) =>
									entry.id === createModal.sectionId
										? { ...entry, items: [...entry.items, bullet] }
										: entry,
								),
							}
						: current,
				);
				setToast({ type: "success", message: "Bullet item added." });
				break;
			}
			case "custom-link": {
				if (!createModal.sectionId) break;
				const label = createForm.label?.trim() || "";
				const url = createForm.url?.trim() || "";
				if (!label && !url) {
					setToast({ type: "error", message: "Link label or URL is required." });
					return;
				}
				setPortfolio((current) =>
					current
						? {
								...current,
								customSections: current.customSections.map((entry) =>
									entry.id === createModal.sectionId
										? {
												...entry,
												links: [...entry.links, { id: `${Date.now()}-link`, label, url }],
											}
										: entry,
								),
							}
						: current,
				);
				setToast({ type: "success", message: "Link item added." });
				break;
			}
			case "tech-item": {
				if (!createModal.sectionId) break;
				const tech = createForm.tech?.trim() || "";
				if (!tech) {
					setToast({ type: "error", message: "Technology name is required." });
					return;
				}
				addTechToCategory(createModal.sectionId, tech);
				setQuickTechInput((current) => ({ ...current, [createModal.sectionId!]: "" }));
				setToast({ type: "success", message: "Technology added." });
				break;
			}
		}

		setCreateModal(null);
		setCreateForm({});
	};

	useEffect(() => {
		if (!pendingFocusExperienceId) return;
		const node = experienceItemRefs.current[pendingFocusExperienceId];
		if (!node) return;
		node.scrollIntoView({ behavior: "smooth", block: "center" });
		node.focus({ preventScroll: true });
		setPendingFocusExperienceId(null);
	}, [pendingFocusExperienceId, portfolio]);

	const getLayoutOrder = (source: EditablePortfolio) =>
		getVisibleSectionOrder(source);

	const getHiddenSections = (source: EditablePortfolio) =>
		getVisibleHiddenSections(source);

	const getSectionSpan = (
		source: EditablePortfolio,
		sectionKey: PortfolioSectionKey,
	): PortfolioSectionSpan => {
		const span = source.layout?.sectionSpans?.[sectionKey];
		return GRID_ALLOWED_SPANS.includes(span as PortfolioSectionSpan)
			? (span as PortfolioSectionSpan)
			: (defaultPortfolioLayout.sectionSpans[sectionKey] ?? 6);
	};

	const normalizeOrder = (nextOrder: PortfolioSectionKey[]) => {
		const deduped = nextOrder.filter((key, index, arr) => arr.indexOf(key) === index);
		return deduped.length > 0 ? deduped : [...defaultPortfolioLayout.sectionOrder];
	};

	const snapToAllowedSpan = (value: number): PortfolioSectionSpan => {
		let nearest = GRID_ALLOWED_SPANS[0];
		let delta = Math.abs(value - nearest);
		for (const span of GRID_ALLOWED_SPANS) {
			const nextDelta = Math.abs(value - span);
			if (nextDelta < delta) {
				nearest = span;
				delta = nextDelta;
			}
		}
		return nearest;
	};

	const clampSectionHeight = (value: number) =>
		Math.min(GRID_MAX_HEIGHT, Math.max(GRID_MIN_HEIGHT, Math.round(value)));

	const getSectionHeight = (
		source: EditablePortfolio,
		sectionKey: PortfolioSectionKey,
	): number => {
		const height = Number(source.layout?.sectionHeights?.[sectionKey]);
		if (Number.isFinite(height)) {
			return clampSectionHeight(height);
		}
		return clampSectionHeight(defaultPortfolioLayout.sectionHeights[sectionKey] ?? 6);
	};

	const resolveSectionSpanRecord = (
		source: EditablePortfolio,
	): Record<PortfolioSectionKey, PortfolioSectionSpan> => ({
		about: getSectionSpan(source, "about"),
		timeline: getSectionSpan(source, "timeline"),
		experience: getSectionSpan(source, "experience"),
		tech: getSectionSpan(source, "tech"),
		projects: getSectionSpan(source, "projects"),
		heatmap: getSectionSpan(source, "heatmap"),
		custom: getSectionSpan(source, "custom"),
	});

	const resolveSectionHeightRecord = (
		source: EditablePortfolio,
	): Record<PortfolioSectionKey, number> => ({
		about: getSectionHeight(source, "about"),
		timeline: getSectionHeight(source, "timeline"),
		experience: getSectionHeight(source, "experience"),
		tech: getSectionHeight(source, "tech"),
		projects: getSectionHeight(source, "projects"),
		heatmap: getSectionHeight(source, "heatmap"),
		custom: getSectionHeight(source, "custom"),
	});

	const removeSectionFromLayout = (sectionKey: PortfolioSectionKey) => {
		setPortfolio((current) => {
			if (!current) return current;
			const order = getLayoutOrder(current);
			if (order.length <= 1 || !order.includes(sectionKey)) return current;
			return {
				...current,
				layout: {
					...current.layout,
					sectionOrder: order.filter((key) => key !== sectionKey),
				},
			};
		});
		setLayoutFeedback(`Removed ${SECTION_META[sectionKey].title} from canvas.`);
	};

	const addSectionBackToLayout = (sectionKey: PortfolioSectionKey) => {
		setPortfolio((current) => {
			if (!current) return current;
			const order = getLayoutOrder(current);
			if (order.includes(sectionKey)) return current;
			return {
				...current,
				layout: {
					...current.layout,
					sectionOrder: [...order, sectionKey],
				},
			};
		});
		setPendingAutoFit(true);
		setLayoutFeedback(`Added ${SECTION_META[sectionKey].title} back to canvas.`);
	};

	const buildGridLayoutFromPortfolio = (source: EditablePortfolio): GridLayoutModel => {
		const order = getLayoutOrder(source);
		let cursorX = 0;
		let cursorY = 0;
		let currentRowHeight = 0;

		return order.map((sectionKey) => {
			const w = getSectionSpan(source, sectionKey);
			const h = getSectionHeight(source, sectionKey);

			if (cursorX + w > GRID_COLS) {
				cursorX = 0;
				cursorY += currentRowHeight || 1;
				currentRowHeight = 0;
			}

			const item: GridLayoutItem = {
				i: sectionKey,
				x: cursorX,
				y: cursorY,
				w,
				h,
				minW: 4,
				maxW: GRID_COLS,
				minH: GRID_MIN_HEIGHT,
				maxH: GRID_MAX_HEIGHT,
				isBounded: true,
			};

			cursorX += w;
			currentRowHeight = Math.max(currentRowHeight, h);
			return item;
		});
	};

	const layoutSignature = useMemo(() => {
		if (!portfolio) return "";
		const order = getLayoutOrder(portfolio).join("|");
		const spans = getLayoutOrder(portfolio)
			.map((key) => `${key}:${getSectionSpan(portfolio, key)}`)
			.join("|");
		const heights = getLayoutOrder(portfolio)
			.map((key) => `${key}:${getSectionHeight(portfolio, key)}`)
			.join("|");
		return `${order}__${spans}__${heights}`;
	}, [portfolio]);

	useEffect(() => {
		if (!portfolio) return;
		setCanvasLayout(buildGridLayoutFromPortfolio(portfolio));
	}, [layoutSignature, portfolio]);

	const commitGridLayoutToPortfolio = (nextLayout: GridLayoutModel) => {
		setPortfolio((current) => {
			if (!current) return current;

			const sorted = [...nextLayout].sort((a, b) =>
				a.y === b.y ? a.x - b.x : a.y - b.y,
			);
			const nextOrder = normalizeOrder(
				sorted.map((item) => item.i as PortfolioSectionKey),
			);
			const nextSpans = sorted.reduce<Record<PortfolioSectionKey, PortfolioSectionSpan>>(
				(acc, item) => {
					const key = item.i as PortfolioSectionKey;
					acc[key] = snapToAllowedSpan(item.w);
					return acc;
				},
				resolveSectionSpanRecord(current),
			);
			const nextHeights = sorted.reduce<Record<PortfolioSectionKey, number>>(
				(acc, item) => {
					const key = item.i as PortfolioSectionKey;
					acc[key] = clampSectionHeight(item.h);
					return acc;
				},
				resolveSectionHeightRecord(current),
			);

			return {
				...current,
				layout: {
					sectionOrder: nextOrder,
					sectionSpans: nextSpans,
					sectionHeights: nextHeights,
				},
			};
		});
	};

	const getCanvasSectionContent = (
		sectionKey: PortfolioSectionKey,
		source: EditablePortfolio,
	): ReactNode => {
		switch (sectionKey) {
			case "about":
				return <About paragraphs={source.about} />;
			case "timeline":
				return <Timeline items={source.timeline} />;
			case "experience":
				return <Experience items={source.experiences} />;
			case "tech":
				return <TechStack categories={source.techCategories} />;
			case "projects":
				return <Projects items={source.projects} />;
			case "heatmap":
				return source.githubUsername?.trim() ? (
					<Heatmap username={source.githubUsername} />
				) : (
					<div className="text-sm text-muted-foreground">
						GitHub username is empty. Add one to show the heatmap.
					</div>
				);
			case "custom":
				return source.customSections.length ? (
					<div className="space-y-3">
						{source.customSections.map((section) => (
							<div key={section.id} className="space-y-2">
								<div className="text-base sm:text-lg font-bold">{section.title}</div>
								{section.type === "bullets" ? (
									<ul className="list-disc pl-5 space-y-1 text-sm text-(--app-muted)">
										{section.items?.filter(Boolean).map((item, index) => (
											<li key={`${section.id}-item-${index}`}>{item}</li>
										))}
									</ul>
								) : section.type === "links" ? (
									<div className="space-y-1.5">
										{section.links
											?.filter((link) => link.label || link.url)
											.map((link) => (
												<a
													key={link.id}
													href={link.url || undefined}
													target={link.url ? "_blank" : undefined}
													rel={link.url ? "noreferrer noopener" : undefined}
													className="block text-sm text-(--app-muted) underline underline-offset-2 break-all"
												>
													{link.label || link.url}
												</a>
											))}
									</div>
								) : (
									<p className="text-sm text-(--app-muted) whitespace-pre-wrap">
										{section.body}
									</p>
								)}
							</div>
						))}
					</div>
				) : (
					<div className="text-sm text-muted-foreground">
						No custom sections yet.
					</div>
				);
			default:
				return null;
		}
	};

	const renderCustomSectionsEditor = () => {
		if (!portfolio) return null;
		return (
			<div className="space-y-5">
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={portfolio.customSections.length >= MAX_CUSTOM_SECTIONS}
						onClick={() =>
							openCreateModal(
								{
									kind: "custom-section",
									title: "Create Text Section",
									description: "Provide initial content for the new custom text section.",
									customSectionType: "text",
								},
								{ title: "", body: "" },
							)
						}
					>
						Add text section
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={portfolio.customSections.length >= MAX_CUSTOM_SECTIONS}
						onClick={() =>
							openCreateModal(
								{
									kind: "custom-section",
									title: "Create Bullet List Section",
									description:
										"Add a title and initial bullet items (one per line).",
									customSectionType: "bullets",
								},
								{ title: "", items: "" },
							)
						}
					>
						Add bullet list
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={portfolio.customSections.length >= MAX_CUSTOM_SECTIONS}
						onClick={() =>
							openCreateModal(
								{
									kind: "custom-section",
									title: "Create Links Section",
									description: "Add a title and the first link for this section.",
									customSectionType: "links",
								},
								{ title: "", label: "", url: "" },
							)
						}
					>
						Add links section
					</Button>
				</div>
				<div className="text-xs text-muted-foreground">
					{portfolio.customSections.length} / {MAX_CUSTOM_SECTIONS} custom sections
				</div>
				<div className="space-y-4">
					{portfolio.customSections.map((item, index) => {
					const panelId = `custom-${item.id}`;
					const isOpen = openPanels[panelId] ?? index === 0;
					return (
					<div key={item.id} className="space-y-3 rounded-xl bg-muted/20 p-4">
						<div className="flex items-center justify-between gap-2">
							<div className="space-y-0.5">
								<div className="text-xs font-medium text-muted-foreground">
									Section {index + 1}
								</div>
								<div className="text-sm font-medium">
									{item.title || "Untitled section"}
								</div>
							</div>
							<div className="flex items-center gap-1">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => togglePanel(panelId)}
								>
									{isOpen ? (
										<>
											Collapse <ChevronUp className="size-3.5" />
										</>
									) : (
										<>
											Edit <ChevronDown className="size-3.5" />
										</>
									)}
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() =>
										setPortfolio((current) =>
											current
												? {
														...current,
														customSections: current.customSections.filter(
															(entry) => entry.id !== item.id,
														),
													}
												: current,
										)
									}
								>
									Remove section
								</Button>
							</div>
						</div>
						{!isOpen ? (
							<div className="rounded-lg bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
								{item.type === "bullets"
									? `${item.items?.filter(Boolean).length ?? 0} bullet item(s)`
									: item.type === "links"
										? `${item.links?.filter((link) => link.label || link.url).length ?? 0} link(s)`
										: item.body?.trim() || "No content yet."}
							</div>
						) : (
							<>
								<Input
									placeholder="Section title"
									value={item.title}
									onChange={(event) =>
										setPortfolio((current) =>
											current
												? {
														...current,
														customSections: current.customSections.map((entry) =>
															entry.id === item.id
																? { ...entry, title: event.target.value }
																: entry,
														),
													}
												: current,
										)
									}
								/>
								<div className="space-y-2">
									<Label>Type</Label>
									<select
										className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
										value={item.type}
										onChange={(event) =>
											setPortfolio((current) =>
												current
													? {
															...current,
															customSections: current.customSections.map((entry) =>
																entry.id === item.id
																	? {
																			...entry,
																			type: event.target.value as CustomSection["type"],
																			items:
																				event.target.value === "bullets"
																					? entry.items?.length
																						? entry.items
																						: [""]
																					: [],
																			links:
																				event.target.value === "links"
																					? entry.links?.length
																						? entry.links
																						: [{ id: `${Date.now()}-link`, label: "", url: "" }]
																					: [],
																		}
																	: entry,
															),
														}
													: current,
											)
										}
									>
										<option value="text">Text</option>
										<option value="bullets">Bullet List</option>
										<option value="links">Links</option>
									</select>
								</div>
								{item.type === "bullets" ? (
									<div className="space-y-2">
										{item.items.map((bullet, bulletIndex) => (
											<div key={`${item.id}-bullet-${bulletIndex}`} className="flex gap-2">
												<Input
													placeholder="Bullet item"
													value={bullet}
													onChange={(event) =>
														setPortfolio((current) =>
															current
																? {
																		...current,
																		customSections: current.customSections.map((entry) =>
																			entry.id === item.id
																				? {
																						...entry,
																						items: entry.items.map((row, rowIndex) =>
																							rowIndex === bulletIndex ? event.target.value : row,
																						),
																					}
																				: entry,
																		),
																	}
																: current,
														)
													}
												/>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() =>
														setPortfolio((current) =>
															current
																? {
																		...current,
																		customSections: current.customSections.map((entry) =>
																			entry.id === item.id
																				? {
																						...entry,
																						items:
																							entry.items.length > 1
																								? entry.items.filter((_, i) => i !== bulletIndex)
																								: entry.items,
																					}
																				: entry,
																		),
																	}
																: current,
														)
													}
												>
													Remove
												</Button>
											</div>
										))}
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() =>
												openCreateModal(
													{
														kind: "custom-bullet",
														title: "Add Bullet Item",
														description: "Add one bullet item to this section.",
														sectionId: item.id,
													},
													{ bullet: "" },
												)
											}
										>
											Add bullet item
										</Button>
									</div>
								) : item.type === "links" ? (
									<div className="space-y-2">
										{item.links.map((link, linkIndex) => (
											<div
												key={link.id || `${item.id}-link-${linkIndex}`}
												className="space-y-2 rounded-md border p-2"
											>
												<Input
													placeholder="Link label"
													value={link.label}
													onChange={(event) =>
														setPortfolio((current) =>
															current
																? {
																		...current,
																		customSections: current.customSections.map((entry) =>
																			entry.id === item.id
																				? {
																						...entry,
																						links: entry.links.map((row, rowIndex) =>
																							rowIndex === linkIndex
																								? { ...row, label: event.target.value }
																								: row,
																						),
																					}
																				: entry,
																		),
																	}
																: current,
														)
													}
												/>
												<Input
													placeholder="https://example.com"
													value={link.url}
													onChange={(event) =>
														setPortfolio((current) =>
															current
																? {
																		...current,
																		customSections: current.customSections.map((entry) =>
																			entry.id === item.id
																				? {
																						...entry,
																						links: entry.links.map((row, rowIndex) =>
																							rowIndex === linkIndex
																								? { ...row, url: event.target.value }
																								: row,
																						),
																					}
																				: entry,
																		),
																	}
																: current,
														)
													}
												/>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() =>
														setPortfolio((current) =>
															current
																? {
																		...current,
																		customSections: current.customSections.map((entry) =>
																			entry.id === item.id
																				? {
																						...entry,
																						links:
																							entry.links.length > 1
																								? entry.links.filter((_, i) => i !== linkIndex)
																								: entry.links,
																					}
																				: entry,
																		),
																	}
																: current,
														)
													}
												>
													Remove link
												</Button>
											</div>
										))}
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() =>
												openCreateModal(
													{
														kind: "custom-link",
														title: "Add Link",
														description: "Add a new link row to this section.",
														sectionId: item.id,
													},
													{ label: "", url: "" },
												)
											}
										>
											Add link
										</Button>
									</div>
								) : (
									<Textarea
										rows={4}
										value={item.body}
										onChange={(event) =>
											setPortfolio((current) =>
												current
													? {
															...current,
															customSections: current.customSections.map((entry) =>
																entry.id === item.id
																	? { ...entry, body: event.target.value }
																	: entry,
															),
														}
													: current,
											)
										}
									/>
								)}
							</>
						)}
					</div>
					);
				})}
				</div>
			</div>
		);
	};

	if (
		sessionQuery.isLoading ||
		portfolioQuery.isLoading ||
		(draftMode && versionPreviewQuery.isLoading) ||
		(hasSelectedVersionId && versionDetailQuery.isLoading)
	) {
		return <div className="app-card p-6">Loading editor...</div>;
	}
	if (!portfolio) return null;

	const activeVersion = versionsQuery.data?.find((version) => version.isActive) ?? null;
	const selectedVersionSummary = versionDetailQuery.data?.version ?? null;
	const editingVersion = draftMode
		? null
		: hasSelectedVersionId
		? selectedVersionSummary
		: activeVersion;
	const canManageSelectedDraftVersion = Boolean(!draftMode && editingVersion);
	const editingVersionName = draftMode
		? draftName || "Untitled Draft"
		: editingVersion?.name ?? "Version";
	const editingVersionIsLive = draftMode ? false : Boolean(editingVersion?.isActive);
	const modeTitle = draftMode ? "Creating" : "Editing";
	const modeBadgeLabel = draftMode
		? "Draft (Unsaved)"
		: editingVersionIsLive
			? "Live"
			: "Draft";

	return (
		<main className="space-y-5 pb-10">
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
			<Card className="bg-gradient-to-br from-violet-500/12 via-sky-500/8 to-transparent shadow-none">
				<CardHeader className="gap-3">
					<div className="space-y-2">
						<Badge variant="secondary" className="w-fit">
							<Layers3 className="mr-1 size-3.5" />
							Portfolio Editor
						</Badge>
						<div className="flex flex-wrap items-center gap-2">
							<CardTitle className="text-xl sm:text-2xl">
								{modeTitle}: {editingVersionName}
							</CardTitle>
							<Badge
								variant={editingVersionIsLive ? "secondary" : "outline"}
								className={
									editingVersionIsLive
										? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
										: undefined
								}
							>
								{modeBadgeLabel}
							</Badge>
						</div>
						<CardDescription>
							Public URL: <span className="font-medium">/{portfolio.username}</span>
						</CardDescription>
					</div>
						<CardAction className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
							{canManageSelectedDraftVersion ? (
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="h-9 px-3"
									onClick={() => setRenameDialogOpen(true)}
								>
									<Pencil className="size-4" />
									Rename
								</Button>
							) : null}
							{canManageSelectedDraftVersion ? (
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="h-9 px-3 text-destructive hover:text-destructive"
									onClick={() => setDeleteDialogOpen(true)}
									disabled={Boolean(editingVersion?.isActive)}
								>
									<Trash2 className="size-4" />
									Delete
								</Button>
							) : null}
							<Button
								type="button"
								size="sm"
								variant="outline"
								className="h-9 px-3"
								onClick={() => setPreviewOpen(true)}
							>
								<Eye className="size-4" />
								Preview
							</Button>
							<Button
								type="button"
								size="sm"
								className="h-9 px-3"
								onClick={() => saveMutation.mutate()}
								disabled={saveMutation.isPending}
							>
								<Save className="size-4" />
								{saveMutation.isPending ? "Saving..." : "Save changes"}
							</Button>
							<span className="text-xs text-muted-foreground">
								Ctrl/Cmd + S
							</span>
						</CardAction>
				</CardHeader>
			</Card>
			{draftMode ? (
				<div className="rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
					You are creating a draft. This is not public yet until you save and set a version live.
				</div>
			) : editingVersion && !editingVersionIsLive ? (
				<div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2">
					<div className="text-sm text-amber-800 dark:text-amber-200">
						You are editing a draft version. Public generated portfolio still shows the current live version.
					</div>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => activateVersionMutation.mutate(editingVersion.id)}
						disabled={activateVersionMutation.isPending}
					>
						{activateVersionMutation.isPending ? "Setting live..." : "Set this version live"}
					</Button>
				</div>
			) : null}

			<Tabs value={activeTab} onValueChange={setActiveTab} className="gap-3">
				<TabsList
					className="!h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-muted/45 p-1"
				>
					<TabsTrigger value="profile" className="h-9 flex-none rounded-lg px-3">
						Profile
					</TabsTrigger>
					<TabsTrigger value="story" className="h-9 flex-none rounded-lg px-3">
						Story
					</TabsTrigger>
					<TabsTrigger value="career" className="h-9 flex-none rounded-lg px-3">
						Career
					</TabsTrigger>
					<TabsTrigger value="stack" className="h-9 flex-none rounded-lg px-3">
						Stack & Projects
					</TabsTrigger>
					<TabsTrigger value="layout" className="h-9 flex-none rounded-lg px-3">
						Layout
					</TabsTrigger>
					<TabsTrigger value="extras" className="h-9 flex-none rounded-lg px-3">
						Extras
					</TabsTrigger>
				</TabsList>

				<TabsContent value="profile" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<Card className="shadow-none">
						<CardHeader>
							<div>
								<CardTitle>Identity</CardTitle>
								<CardDescription>Your name, headline, and background summary.</CardDescription>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							{[
								["fullName", "Full name"],
								["headline", "Headline"],
								["location", "Location"],
								["experienceSummary", "Experience summary"],
								["education", "Education"],
								["availability", "Availability"],
							].map(([key, label]) => (
								<div key={key} className="space-y-2 rounded-lg bg-muted/20 p-3">
									<Label htmlFor={key}>{label}</Label>
									<Input
										id={key}
										value={String(portfolio[key as keyof EditablePortfolio] ?? "")}
										onChange={(event) =>
											setBasicField(
												key as Parameters<typeof setBasicField>[0],
												event.target.value,
											)
										}
									/>
								</div>
							))}
						</CardContent>
					</Card>

					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>Links & Visuals</CardTitle>
							<CardDescription>
								Set your profile media and header action chips.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2 rounded-lg bg-muted/20 p-4">
								<Label>Profile photo</Label>
								<div className="flex flex-wrap gap-2">
									<Button
										type="button"
										variant={avatarInputMode === "upload" ? "default" : "outline"}
										size="sm"
										onClick={() => setAvatarInputMode("upload")}
									>
										Upload photo
									</Button>
									<Button
										type="button"
										variant={avatarInputMode === "link" ? "default" : "outline"}
										size="sm"
										onClick={() => setAvatarInputMode("link")}
									>
										Photo link
									</Button>
								</div>
								<div className="flex items-center gap-3">
									<img
										src={getAvatarUrl(portfolio.avatarUrl)}
										alt={portfolio.fullName}
										className="size-16 rounded-full border object-cover"
									/>
									<div className="space-y-2">
										{avatarInputMode === "upload" ? (
											<>
												<div className="flex flex-wrap gap-2">
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={() => avatarInputRef.current?.click()}
														disabled={uploadAvatarMutation.isPending}
													>
														{uploadAvatarMutation.isPending
															? "Uploading..."
															: "Upload photo"}
													</Button>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => setBasicField("avatarUrl", "")}
													>
														Use default
													</Button>
												</div>
												<p className="text-xs text-muted-foreground">
													Accepted: JPG, PNG, WEBP, GIF. Max size 3MB.
												</p>
											</>
										) : (
											<div className="space-y-2">
												<Input
													value={String(portfolio.avatarUrl ?? "")}
													onChange={(event) =>
														setBasicField("avatarUrl", event.target.value)
													}
													placeholder="https://example.com/avatar.jpg"
												/>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => setBasicField("avatarUrl", "")}
												>
													Use default
												</Button>
											</div>
										)}
									</div>
								</div>
								<input
									ref={avatarInputRef}
									type="file"
									accept="image/jpeg,image/png,image/webp,image/gif"
									className="hidden"
									onChange={(event) => {
										const file = event.target.files?.[0];
										if (file) {
											uploadAvatarMutation.mutate(file);
										}
										event.currentTarget.value = "";
									}}
								/>
							</div>
							<div className="space-y-2 rounded-lg bg-muted/20 p-4">
								<Label>Cover image</Label>
								<div className="flex flex-wrap gap-2">
									<Button
										type="button"
										variant={coverInputMode === "upload" ? "default" : "outline"}
										size="sm"
										onClick={() => setCoverInputMode("upload")}
									>
										Upload cover
									</Button>
									<Button
										type="button"
										variant={coverInputMode === "link" ? "default" : "outline"}
										size="sm"
										onClick={() => setCoverInputMode("link")}
									>
										Cover link
									</Button>
								</div>
								<div className="space-y-2">
									<div className="overflow-hidden rounded-md border">
										<img
											src={
												resolveAssetUrl(String(portfolio.coverUrl ?? "")) ||
												"/default-cover.svg"
											}
											alt="Cover preview"
											className="h-24 w-full object-cover"
										/>
									</div>
									{coverInputMode === "upload" ? (
										<>
											<div className="flex flex-wrap gap-2">
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => coverInputRef.current?.click()}
													disabled={uploadCoverMutation.isPending}
												>
													{uploadCoverMutation.isPending
														? "Uploading..."
														: "Upload cover"}
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => setBasicField("coverUrl", "")}
												>
													Clear cover
												</Button>
											</div>
											<p className="text-xs text-muted-foreground">
												Accepted: JPG, PNG, WEBP, GIF. Max size 5MB.
											</p>
										</>
									) : (
										<div className="space-y-2">
											<Input
												value={String(portfolio.coverUrl ?? "")}
												onChange={(event) =>
													setBasicField("coverUrl", event.target.value)
												}
												placeholder="https://example.com/cover.jpg"
											/>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => setBasicField("coverUrl", "")}
											>
												Clear cover
											</Button>
										</div>
									)}
								</div>
								<input
									ref={coverInputRef}
									type="file"
									accept="image/jpeg,image/png,image/webp,image/gif"
									className="hidden"
									onChange={(event) => {
										const file = event.target.files?.[0];
										if (file) {
											uploadCoverMutation.mutate(file);
										}
										event.currentTarget.value = "";
									}}
								/>
							</div>
							<div className="rounded-lg bg-muted/20 p-4">
								<div className="mb-3 flex items-center justify-between gap-2">
									<div>
										<div className="text-sm font-medium">Header actions</div>
										<div className="text-xs text-muted-foreground">
											Shown as clickable chips in your header. Max 4.
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => setIsHeaderActionsEditorOpen(true)}
										>
											Manage actions
										</Button>
									</div>
								</div>
								<div className="rounded-md border bg-background/70 px-3 py-2">
									<div className="text-xs text-muted-foreground">
										{portfolio.headerActions.length} of {MAX_HEADER_ACTIONS} actions configured
									</div>
									<div className="mt-2 flex flex-wrap gap-2">
										{portfolio.headerActions.map((action) => (
											<span
												key={action.id}
												className="rounded-md border bg-muted/45 px-2 py-1 text-xs"
											>
												{action.type} • {action.display === "value" ? "value" : "label"}
											</span>
										))}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="story" className="space-y-6">
					<Card className="shadow-none">
						<CardHeader>
							<div className="flex items-center justify-between gap-3">
								<div>
									<CardTitle>About section</CardTitle>
									<CardDescription>
										Write your full About content in markdown.
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-3 rounded-xl bg-muted/20 p-4">
								<div className="flex items-center justify-between gap-3">
									<div className="text-xs font-medium text-muted-foreground">
										About (Markdown)
									</div>
									<div className="flex items-center gap-2">
										<Button
											type="button"
											size="sm"
											variant={aboutMarkdownView === "write" ? "default" : "outline"}
											onClick={() => setAboutMarkdownView("write")}
										>
											Write
										</Button>
										<Button
											type="button"
											size="sm"
											variant={aboutMarkdownView === "preview" ? "default" : "outline"}
											onClick={() => setAboutMarkdownView("preview")}
										>
											Preview
										</Button>
									</div>
								</div>
								{aboutMarkdownView === "write" ? (
									<Textarea
										value={aboutMarkdownValue}
										rows={14}
										onChange={(event) => {
											const nextValue = event.target.value;
											setAboutMarkdownValue(nextValue);
											setPortfolio((current) => {
												if (!current) return current;
												return {
													...current,
													about: [nextValue],
												};
											});
										}}
										placeholder="Write your full About content in markdown..."
									/>
								) : (
									<div className="space-y-2 rounded-lg border bg-background px-3 py-2">
										<div className="markdown-render text-sm">
											<ReactMarkdown remarkPlugins={[remarkGfm]}>
												{aboutMarkdownValue.trim() || "_No content yet._"}
											</ReactMarkdown>
										</div>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="career" className="grid grid-cols-1 gap-6 xl:grid-cols-2">
					<Card className="shadow-none">
						<CardHeader>
							<div>
								<CardTitle>Timeline</CardTitle>
								<CardDescription>Career milestones and key dates.</CardDescription>
							</div>
						</CardHeader>
						<CardContent className="space-y-4 border-t border-border/60 pt-4">
							<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/10 px-3 py-2">
								<div className="text-xs text-muted-foreground">
									Each card below is one timeline entry. Expand a card to edit fields.
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() =>
										openCreateModal(
											{
												kind: "timeline",
												title: "Create Timeline Item",
												description: "Set the milestone details before adding it.",
											},
											{ year: "", position: "", company: "", note: "" },
										)
									}
								>
									Add timeline item
								</Button>
							</div>
							<div className="space-y-4">
								{portfolio.timeline.map((item, index) => {
								const panelId = `timeline-${item.id}`;
								const isOpen = openPanels[panelId] ?? index === 0;
								return (
								<div
									key={item.id}
									className={`space-y-3 rounded-xl border p-4 transition-colors ${
										isOpen
											? "border-(--app-accent)/50 bg-(--app-accent)/[0.08] shadow-[inset_3px_0_0_var(--app-accent)]"
											: "border-border/60 bg-muted/20"
									}`}
								>
									<div className="flex items-center justify-between gap-2">
										<div className="space-y-0.5">
											<div className="text-xs font-medium text-muted-foreground">
												Timeline item {index + 1}
											</div>
											<div className="text-sm font-medium">
												{item.position || item.company || "Untitled milestone"}
											</div>
										</div>
										<div className="rounded-md bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground">
											{isOpen ? "Editing" : "Collapsed"}
										</div>
										<div className="flex items-center gap-1">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => togglePanel(panelId)}
											>
												{isOpen ? (
													<>
														Collapse <ChevronUp className="size-3.5" />
													</>
												) : (
													<>
														Edit <ChevronDown className="size-3.5" />
													</>
												)}
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() =>
													setPortfolio((current) =>
														current
															? {
																	...current,
																	timeline: current.timeline.filter(
																		(entry) => entry.id !== item.id,
																	),
																}
															: current,
													)
												}
											>
												Remove
											</Button>
										</div>
									</div>
									{!isOpen ? (
										<div className="grid gap-2 rounded-lg border border-border/50 bg-background/70 p-3 text-sm text-muted-foreground sm:grid-cols-2">
											<div className="space-y-0.5">
												<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
													Date
												</div>
												<div>{item.year?.trim() || "—"}</div>
											</div>
											<div className="space-y-0.5">
												<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
													Role
												</div>
												<div>{item.position?.trim() || "—"}</div>
											</div>
											<div className="space-y-0.5 sm:col-span-2">
												<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
													Company
												</div>
												<div>{item.company?.trim() || "—"}</div>
											</div>
										</div>
									) : (
										<div className="space-y-3 rounded-lg border border-border/50 bg-background/70 p-3">
											<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
												<div className="space-y-1">
													<Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
														Year
													</Label>
													<Input
														placeholder="2026"
														value={item.year}
														onChange={(event) =>
															setPortfolio((current) =>
																current
																	? {
																			...current,
																			timeline: current.timeline.map((entry) =>
																				entry.id === item.id
																					? { ...entry, year: event.target.value }
																					: entry,
																			),
																		}
																	: current,
															)
														}
													/>
												</div>
												<div className="space-y-1">
													<Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
														Position
													</Label>
													<Input
														placeholder="Full Stack Developer"
														value={item.position}
														onChange={(event) =>
															setPortfolio((current) =>
																current
																	? {
																			...current,
																			timeline: current.timeline.map((entry) =>
																				entry.id === item.id
																					? { ...entry, position: event.target.value }
																					: entry,
																			),
																		}
																	: current,
															)
														}
													/>
												</div>
											</div>
											<div className="space-y-1">
												<Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
													Company
												</Label>
												<Input
													placeholder="Your Company"
													value={item.company}
													onChange={(event) =>
														setPortfolio((current) =>
															current
																? {
																		...current,
																		timeline: current.timeline.map((entry) =>
																			entry.id === item.id
																				? { ...entry, company: event.target.value }
																				: entry,
																		),
																	}
																: current,
														)
													}
												/>
											</div>
											<div className="space-y-1">
												<Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
													Note
												</Label>
												<Input
													placeholder="Current role"
													value={item.note}
													onChange={(event) =>
														setPortfolio((current) =>
															current
																? {
																		...current,
																		timeline: current.timeline.map((entry) =>
																			entry.id === item.id
																				? { ...entry, note: event.target.value }
																				: entry,
																		),
																	}
																: current,
														)
													}
												/>
											</div>
										</div>
									)}
								</div>
								);
							})}
							</div>
						</CardContent>
					</Card>

					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>Experience</CardTitle>
							<CardDescription>Roles, periods, and achievements.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4 border-t border-border/60 pt-4">
							<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/10 px-3 py-2">
								<div className="text-xs text-muted-foreground">
									Each card below is one role. Expand a card to edit role, company, and highlights.
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() =>
										openCreateModal(
											{
												kind: "experience",
												title: "Create Role",
												description: "Set role details before adding it to Experience.",
											},
											{ role: "", company: "", period: "", highlights: "" },
										)
									}
								>
									Add role
								</Button>
							</div>
							<div className="space-y-4">
								{portfolio.experiences.map((item, index) => {
								const panelId = `experience-${item.id}`;
								const isOpen = openPanels[panelId] ?? index === 0;
								return (
								<div
									key={item.id}
									ref={(node) => {
										experienceItemRefs.current[item.id] = node;
									}}
									tabIndex={-1}
									className={`space-y-3 rounded-xl border p-4 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--app-accent) ${
										isOpen
											? "border-(--app-accent)/50 bg-(--app-accent)/[0.08] shadow-[inset_3px_0_0_var(--app-accent)]"
											: "border-border/60 bg-muted/20"
									}`}
								>
									<div className="flex items-center justify-between gap-2">
										<div className="space-y-0.5">
											<div className="text-xs font-medium text-muted-foreground">
												Role {index + 1}
											</div>
											<div className="text-sm font-medium">
												{item.role || item.company || "Untitled role"}
											</div>
										</div>
										<div className="rounded-md bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground">
											{isOpen ? "Editing" : "Collapsed"}
										</div>
										<div className="flex items-center gap-1">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => togglePanel(panelId)}
											>
												{isOpen ? (
													<>
														Collapse <ChevronUp className="size-3.5" />
													</>
												) : (
													<>
														Edit <ChevronDown className="size-3.5" />
													</>
												)}
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() =>
													setPortfolio((current) =>
														current
															? {
																	...current,
																	experiences: current.experiences.filter(
																		(entry) => entry.id !== item.id,
																	),
																}
															: current,
													)
												}
											>
												Remove role
											</Button>
										</div>
									</div>
									{!isOpen ? (
										<div className="grid gap-2 rounded-lg border border-border/50 bg-background/70 p-3 text-sm text-muted-foreground sm:grid-cols-2">
											<div className="space-y-0.5">
												<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
													Role
												</div>
												<div>{item.role?.trim() || "—"}</div>
											</div>
											<div className="space-y-0.5">
												<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
													Company
												</div>
												<div>{item.company?.trim() || "—"}</div>
											</div>
											<div className="space-y-0.5 sm:col-span-2">
												<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
													Period
												</div>
												<div>{item.period?.trim() || "—"}</div>
											</div>
										</div>
									) : (
										<div className="space-y-3 rounded-lg border border-border/50 bg-background/70 p-3">
											<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
												<div className="space-y-1">
													<Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
														Role
													</Label>
													<Input
														placeholder="Full Stack Developer"
														value={item.role}
														onChange={(event) =>
															setPortfolio((current) =>
																current
																	? {
																			...current,
																			experiences: current.experiences.map((entry) =>
																				entry.id === item.id
																					? { ...entry, role: event.target.value }
																					: entry,
																			),
																		}
																	: current,
															)
														}
													/>
												</div>
												<div className="space-y-1">
													<Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
														Company
													</Label>
													<Input
														placeholder="Your Company"
														value={item.company}
														onChange={(event) =>
															setPortfolio((current) =>
																current
																	? {
																			...current,
																			experiences: current.experiences.map((entry) =>
																				entry.id === item.id
																					? { ...entry, company: event.target.value }
																					: entry,
																			),
																		}
																	: current,
															)
														}
													/>
												</div>
											</div>
											<div className="space-y-1">
												<Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
													Period
												</Label>
												<Input
													placeholder="2024 — Present"
													value={item.period}
													onChange={(event) =>
														setPortfolio((current) =>
															current
																? {
																		...current,
																		experiences: current.experiences.map((entry) =>
																			entry.id === item.id
																				? { ...entry, period: event.target.value }
																				: entry,
																		),
																	}
																: current,
														)
													}
												/>
											</div>
											<div className="space-y-1">
												<Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
													Highlights (one per line)
												</Label>
												<Textarea
													placeholder="Built feature X..."
													rows={4}
													value={item.highlights.join("\n")}
													onChange={(event) =>
														setPortfolio((current) =>
															current
																? {
																		...current,
																		experiences: current.experiences.map((entry) =>
																			entry.id === item.id
																				? {
																						...entry,
																						highlights: event.target.value
																							.split("\n")
																							.map((value) => value.trim())
																							.filter(Boolean),
																					}
																				: entry,
																		),
																	}
																: current,
														)
													}
												/>
											</div>
										</div>
									)}
								</div>
								);
							})}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="stack" className="grid grid-cols-1 gap-6 xl:grid-cols-2">
					<Card className="shadow-none">
						<CardHeader>
							<div>
								<CardTitle>Tech stack</CardTitle>
								<CardDescription>Group skills by category.</CardDescription>
							</div>
						</CardHeader>
						<CardContent className="space-y-4 border-t border-border/60 pt-4">
							<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/10 px-3 py-2">
								<div className="text-xs text-muted-foreground">
									Each card below is one tech category. Expand a card to edit details.
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() =>
										openCreateModal(
											{
												kind: "tech-category",
												title: "Create Tech Category",
												description: "Create the category first, then refine it in the list.",
											},
											{
												categoryMode: "preset",
												presetKey: "frontend",
												name: "Frontend",
												items: "",
												techQuery: "",
											},
										)
									}
								>
									Add category
								</Button>
							</div>
							<div className="space-y-4">
								{portfolio.techCategories.map((item, index) => {
								const panelId = `tech-${item.id}`;
								const isOpen = openPanels[panelId] ?? index === 0;
								return (
								<div
									key={item.id}
									className={`space-y-3 rounded-xl border p-4 transition-colors ${
										isOpen
											? "border-(--app-accent)/50 bg-(--app-accent)/[0.08] shadow-[inset_3px_0_0_var(--app-accent)]"
											: "border-border/60 bg-muted/20"
									}`}
								>
									<div className="flex items-center justify-between gap-2">
										<div className="space-y-0.5">
											<div className="text-xs font-medium text-muted-foreground">
												Category {index + 1}
											</div>
											<div className="text-sm font-medium">
												{item.name || "Untitled category"}
											</div>
										</div>
										<div className="rounded-md bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground">
											{isOpen ? "Editing" : "Collapsed"}
										</div>
										<div className="flex items-center gap-1">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => togglePanel(panelId)}
											>
												{isOpen ? (
													<>
														Collapse <ChevronUp className="size-3.5" />
													</>
												) : (
													<>
														Edit <ChevronDown className="size-3.5" />
													</>
												)}
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() =>
													setPortfolio((current) =>
														current
															? {
																	...current,
																	techCategories: current.techCategories.filter(
																		(entry) => entry.id !== item.id,
																	),
																}
															: current,
													)
												}
											>
												Remove category
											</Button>
										</div>
									</div>
									{!isOpen ? (
										<div className="grid gap-2 rounded-lg border border-border/50 bg-background/70 p-3 text-sm text-muted-foreground sm:grid-cols-2">
											<div className="space-y-0.5">
												<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
													Category
												</div>
												<div>{item.name?.trim() || "—"}</div>
											</div>
											<div className="space-y-0.5">
												<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
													Items
												</div>
												<div>
													{item.items.length} tech item{item.items.length === 1 ? "" : "s"}
												</div>
											</div>
										</div>
									) : (
										<div className="space-y-3 rounded-lg border border-border/50 bg-background/70 p-3">
											<div className="space-y-1">
												<Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
													Preset category
												</Label>
													<select
														className="border-input bg-background ring-offset-background h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
														value={getCategoryPresetKey(item.id, item.name)}
														onChange={(event) =>
															applyPresetToCategory(item.id, event.target.value)
														}
												>
													<option value="">Custom (manual)</option>
													{techCategoryPresets.map((preset) => (
														<option key={`preset-${preset.key}`} value={preset.key}>
															{preset.label}
														</option>
													))}
												</select>
											</div>
											<div className="space-y-1">
												<Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
													Category name
												</Label>
												<Input
													placeholder="Frontend"
													value={item.name}
														onChange={(event) =>
															{
																setCategoryPresetOverrides((current) => ({
																	...current,
																	[item.id]: "custom",
																}));
																setPortfolio((current) =>
																	current
																		? {
																				...current,
																				techCategories: current.techCategories.map((entry) =>
																					entry.id === item.id
																						? { ...entry, name: event.target.value }
																						: entry,
																				),
																			}
																		: current,
																);
															}
														}
													/>
												</div>
											{getCategoryPresetKey(item.id, item.name) ? (
												<div className="space-y-2">
													<div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
														Preset library
													</div>
													<div className="flex flex-wrap gap-2">
															{(
																getTechCategoryPresetByKey(
																	getCategoryPresetKey(
																		item.id,
																		item.name,
																	) as TechCategoryPresetKey,
																)?.items ?? []
															).slice(0, 18).map((techName) => {
															const tech = getTechIcon(techName);
															const hasTech = item.items.some(
																(existing) =>
																	normalizeTechName(existing) ===
																	normalizeTechName(techName),
															);
															return (
																<Button
																	key={`${item.id}-preset-${techName}`}
																	type="button"
																	variant={hasTech ? "secondary" : "outline"}
																	size="sm"
																	disabled={hasTech}
																	className={hasTech ? "font-semibold opacity-100" : ""}
																	onClick={() => addTechToCategory(item.id, techName)}
																>
																	{tech && <tech.Icon className={tech.className} />}
																	{techName}
																	{hasTech ? " (Selected)" : ""}
																</Button>
															);
														})}
													</div>
												</div>
											) : null}
											<div className="space-y-2">
												<div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
													Add technology
												</div>
												<div className="flex gap-2">
													<Input
														list={`tech-options-${item.id}`}
														placeholder="Type technology name"
														value={quickTechInput[item.id] ?? ""}
														onChange={(event) =>
															setQuickTechInput((current) => ({
																...current,
																[item.id]: event.target.value,
															}))
														}
														onKeyDown={(event) => {
															if (event.key === "Enter") {
																event.preventDefault();
																openCreateModal(
																	{
																		kind: "tech-item",
																		title: "Add Technology",
																		description:
																			"Add one technology to this category.",
																		sectionId: item.id,
																	},
																	{
																		tech: quickTechInput[item.id] ?? "",
																	},
																);
															}
														}}
													/>
													<Button
														type="button"
														variant="outline"
														onClick={() =>
															openCreateModal(
																{
																	kind: "tech-item",
																	title: "Add Technology",
																	description:
																		"Add one technology to this category.",
																	sectionId: item.id,
																},
																{
																	tech: quickTechInput[item.id] ?? "",
																},
															)
														}
													>
														Add
													</Button>
													<datalist id={`tech-options-${item.id}`}>
														{searchTechOptions(
															quickTechInput[item.id] ?? item.name,
															25,
														).map((option) => (
															<option key={`${item.id}-opt-${option}`} value={option} />
														))}
													</datalist>
												</div>
											</div>
											{!getCategoryPresetKey(item.id, item.name) ? (
												<div className="space-y-2">
													<div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
														Quick add
													</div>
													<div className="flex flex-wrap gap-2">
														{getSuggestedTechForCategory(item.name, 12).map((techName) => {
															const tech = getTechIcon(techName);
															const hasTech = item.items.some(
																(existing) =>
																	normalizeTechName(existing) ===
																	normalizeTechName(techName),
															);
															return (
																<Button
																	key={`${item.id}-${techName}`}
																	type="button"
																	variant={hasTech ? "secondary" : "outline"}
																	size="sm"
																	disabled={hasTech}
																	className={hasTech ? "font-semibold opacity-100" : ""}
																	onClick={() => addTechToCategory(item.id, techName)}
																>
																	{tech && <tech.Icon className={tech.className} />}
																	{techName}
																	{hasTech ? " (Selected)" : ""}
																</Button>
															);
														})}
													</div>
												</div>
											) : null}
											{item.items.length > 0 && (
												<div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
													<div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
														Selected tech (click to remove)
													</div>
													<div className="flex flex-wrap gap-2">
														{item.items.map((techName, techIndex) => {
															const tech = getTechIcon(techName);
															return (
																<Button
																	key={`${item.id}-${techName}-${techIndex}`}
																	type="button"
																	variant="ghost"
																	size="sm"
																	className="font-semibold"
																	onClick={() => removeTechFromCategory(item.id, techName)}
																>
																	{tech ? (
																		<tech.Icon className={tech.className} />
																	) : (
																		<span className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
																			No icon
																		</span>
																	)}
																	{techName}
																</Button>
															);
														})}
													</div>
												</div>
											)}
										</div>
									)}
								</div>
								);
							})}
							</div>
						</CardContent>
					</Card>

					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>Projects</CardTitle>
							<CardDescription>Showcase your strongest work.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4 border-t border-border/60 pt-4">
							<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/10 px-3 py-2">
								<div className="text-xs text-muted-foreground">
									Each card below is one project. Expand a card to edit project fields.
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() =>
										openCreateModal(
											{
												kind: "project",
												title: "Create Project",
												description: "Add key project details before inserting it.",
											},
											{ name: "", description: "", url: "" },
										)
									}
								>
									Add project
								</Button>
							</div>
							<div className="space-y-4">
								{portfolio.projects.map((item, index) => {
								const panelId = `project-${item.id}`;
								const isOpen = openPanels[panelId] ?? index === 0;
								return (
								<div
									key={item.id}
									className={`space-y-3 rounded-xl border p-4 transition-colors ${
										isOpen
											? "border-(--app-accent)/50 bg-(--app-accent)/[0.08] shadow-[inset_3px_0_0_var(--app-accent)]"
											: "border-border/60 bg-muted/20"
									}`}
								>
									<div className="flex items-center justify-between gap-2">
										<div className="space-y-0.5">
											<div className="text-xs font-medium text-muted-foreground">
												Project {index + 1}
											</div>
											<div className="text-sm font-medium">
												{item.name || "Untitled project"}
											</div>
										</div>
										<div className="rounded-md bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground">
											{isOpen ? "Editing" : "Collapsed"}
										</div>
										<div className="flex items-center gap-1">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => togglePanel(panelId)}
											>
												{isOpen ? (
													<>
														Collapse <ChevronUp className="size-3.5" />
													</>
												) : (
													<>
														Edit <ChevronDown className="size-3.5" />
													</>
												)}
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() =>
													setPortfolio((current) =>
														current
															? {
																	...current,
																	projects: current.projects.filter(
																		(entry) => entry.id !== item.id,
																	),
																}
															: current,
													)
												}
											>
												Remove project
											</Button>
										</div>
									</div>
									{!isOpen ? (
										<div className="grid gap-2 rounded-lg border border-border/50 bg-background/70 p-3 text-sm text-muted-foreground sm:grid-cols-2">
											<div className="space-y-0.5">
												<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
													Description
												</div>
												<div>{item.description?.trim() || "—"}</div>
											</div>
											<div className="space-y-0.5">
												<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
													URL
												</div>
												<div>{item.url?.trim() || "—"}</div>
											</div>
										</div>
									) : (
										<div className="space-y-3 rounded-lg border border-border/50 bg-background/70 p-3">
											<div className="space-y-1">
												<Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
													Project name
												</Label>
												<Input
													placeholder="Your Main Project"
													value={item.name}
													onChange={(event) =>
														setPortfolio((current) =>
															current
																? {
																		...current,
																		projects: current.projects.map((entry) =>
																			entry.id === item.id
																				? { ...entry, name: event.target.value }
																				: entry,
																		),
																	}
																: current,
														)
													}
												/>
											</div>
											<div className="space-y-1">
												<Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
													Short description
												</Label>
												<Input
													placeholder="Describe a project you are proud of in one line."
													value={item.description}
													onChange={(event) =>
														setPortfolio((current) =>
															current
																? {
																		...current,
																		projects: current.projects.map((entry) =>
																			entry.id === item.id
																				? {
																						...entry,
																						description: event.target.value,
																					}
																				: entry,
																		),
																	}
																: current,
														)
													}
												/>
											</div>
											<div className="space-y-1">
												<Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
													Project URL
												</Label>
												<Input
													placeholder="https://..."
													value={item.url}
													onChange={(event) =>
														setPortfolio((current) =>
															current
																? {
																		...current,
																		projects: current.projects.map((entry) =>
																			entry.id === item.id
																				? { ...entry, url: event.target.value }
																				: entry,
																		),
																	}
																: current,
														)
													}
												/>
											</div>
										</div>
									)}
								</div>
								);
							})}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="layout" className="space-y-6">
					<Card className="shadow-none">
						<CardHeader>
							<div>
								<CardTitle>Layout canvas</CardTitle>
								<CardDescription>
									Drag from each block header to reposition. Resize from the bottom-right
									handle to change width.
								</CardDescription>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="rounded-lg bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
								Drag from each card header to reposition blocks. Content inside cards
								stays scrollable if it exceeds current card size.
							</div>
							<div className="rounded-lg bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
								If move or resize is constrained, a hint appears after drop. Resize from
								the bottom-right corner.
							</div>

							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => {
										const snapped = canvasLayout.map((item) => ({
											...item,
											w: snapToAllowedSpan(item.w),
										}));
										setCanvasLayout(snapped);
										commitGridLayoutToPortfolio(snapped);
										setLayoutFeedback("Card widths snapped to supported 4/6/8/12 steps.");
									}}
								>
									Snap widths to 4/6/8/12
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => {
										setPortfolio((current) =>
											current
												? {
														...current,
														layout: {
															sectionOrder: [...defaultPortfolioLayout.sectionOrder],
															sectionSpans: { ...defaultPortfolioLayout.sectionSpans },
															sectionHeights: { ...defaultPortfolioLayout.sectionHeights },
														},
													}
												: current,
										);
										setPendingAutoFit(true);
										setLayoutFeedback(
											"Reset to defaults, then auto-fit heights to content.",
										);
									}}
								>
									Reset to default layout
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => {
										setPendingAutoFit(true);
										setLayoutFeedback("Auto-fitting block heights to content...");
									}}
								>
									Auto-fit heights
								</Button>
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onClick={() => {
										commitGridLayoutToPortfolio(canvasLayout);
										setLayoutFeedback("Layout synced from canvas.");
									}}
								>
									Apply current canvas
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setIsCustomSectionEditorOpen(true)}
								>
									Open custom section editor
								</Button>
							</div>

							{getHiddenSections(portfolio).length > 0 && (
								<div className="space-y-2 rounded-lg bg-muted/35 px-3 py-2">
									<div className="text-xs text-muted-foreground">
										Hidden blocks
									</div>
									<div className="flex flex-wrap gap-2">
										{getHiddenSections(portfolio).map((sectionKey) => (
											<Button
												key={sectionKey}
												type="button"
												variant="outline"
												size="sm"
												onClick={() => addSectionBackToLayout(sectionKey)}
											>
												Add {SECTION_META[sectionKey].title}
											</Button>
										))}
									</div>
								</div>
							)}

							{layoutFeedback && (
								<div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
									{layoutFeedback}
								</div>
							)}

							<div
								ref={layoutContainerRef}
								className="overflow-hidden rounded-xl bg-muted/20"
							>
								<GridLayout
									width={layoutWidth}
									layout={canvasLayout}
									gridConfig={{
										cols: GRID_COLS,
										rowHeight: 26,
										margin: [12, 12],
										containerPadding: [8, 8],
										maxRows: 48,
									}}
									dragConfig={{
										enabled: true,
										bounded: true,
										handle: ".layout-drag-surface",
										cancel: ".layout-block-action",
									}}
									resizeConfig={{
										enabled: true,
										handles: ["se"],
									}}
									onDragStart={(_, oldItem) => {
										if (!oldItem) return;
										setDraggingSection(oldItem.i as PortfolioSectionKey);
										setLayoutFeedback(
											"Drag preview is live. Release to apply the new position.",
										);
									}}
									onDragStop={(nextLayout, oldItem, newItem) => {
										setDraggingSection(null);
										setCanvasLayout(nextLayout);
										commitGridLayoutToPortfolio(nextLayout);

										if (!oldItem || !newItem) return;
										const moved = oldItem.x !== newItem.x || oldItem.y !== newItem.y;
										setLayoutFeedback(
											moved
												? "Placement updated."
												: "This spot is constrained by current grid bounds.",
										);
									}}
									onDrag={(nextLayout) => {
										setCanvasLayout(nextLayout);
									}}
									onResize={(nextLayout) => {
										setCanvasLayout(nextLayout);
									}}
									onResizeStop={(nextLayout, oldItem, newItem) => {
										setCanvasLayout(nextLayout);
										commitGridLayoutToPortfolio(nextLayout);

										if (!oldItem || !newItem) return;
										const resized = oldItem.w !== newItem.w || oldItem.h !== newItem.h;
										setLayoutFeedback(
											resized
												? "Block size updated."
												: "Resize constrained by neighboring blocks or grid bounds.",
										);
									}}
								>
									{getLayoutOrder(portfolio).map((sectionKey) => (
										<div
											key={sectionKey}
											className={`relative h-full ${
												draggingSection === sectionKey ? "ring-2 ring-(--app-accent)" : ""
											}`}
										>
											<div className="layout-block-action absolute right-2 top-2 z-10 flex items-center gap-2 rounded-md border border-border/70 bg-background/90 px-2 py-1 backdrop-blur">
												<div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
													{SECTION_META[sectionKey].title}
												</div>
												<div className="text-[11px] text-muted-foreground">
													{getSectionSpan(portfolio, sectionKey)} / 12
												</div>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="layout-block-action h-6 px-2 text-[11px]"
													disabled={getLayoutOrder(portfolio).length <= 1}
													onClick={() => removeSectionFromLayout(sectionKey)}
												>
													Remove
												</Button>
											</div>
											<div
												ref={(node) => {
													sectionContentRefs.current[sectionKey] = node;
												}}
												className="layout-drag-surface layout-scroll-content app-card h-full min-w-0 max-w-full cursor-move overflow-auto p-2.5 sm:p-4 [overflow-wrap:anywhere]"
											>
												{getCanvasSectionContent(sectionKey, portfolio)}
											</div>
										</div>
									))}
								</GridLayout>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="extras" className="grid grid-cols-1 gap-6 xl:grid-cols-2">
					<Card className="shadow-none">
						<CardHeader>
							<div>
								<CardTitle>Custom sections</CardTitle>
								<CardDescription>Add extra content blocks.</CardDescription>
							</div>
						</CardHeader>
						<CardContent>{renderCustomSectionsEditor()}</CardContent>
					</Card>

					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>GitHub heatmap</CardTitle>
							<CardDescription>Configure the contributions section.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2 rounded-xl bg-muted/20 p-4">
							<Label htmlFor="githubUsername">GitHub username</Label>
							<Input
								id="githubUsername"
								value={String(portfolio.githubUsername ?? "")}
								onChange={(event) =>
									setBasicField("githubUsername", event.target.value)
								}
								placeholder="deuxlim"
							/>
							<p className="text-xs text-muted-foreground">
								Leave empty to hide the heatmap section.
							</p>
						</CardContent>
					</Card>

					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>AI & chat</CardTitle>
							<CardDescription>Control assistant features for this portfolio.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center gap-3 rounded-xl bg-muted/20 p-4">
								<Checkbox
									checked={portfolio.chatEnabled}
									onCheckedChange={(checked) =>
										setPortfolio((current) =>
											current
												? { ...current, chatEnabled: Boolean(checked) }
												: current,
										)
									}
								/>
								<div>
									<p className="text-sm font-medium">Enable portfolio chat</p>
									<p className="text-xs text-muted-foreground">
										Allow visitors to ask questions about your profile.
									</p>
								</div>
							</div>
							<Separator />
							<div className="space-y-2 rounded-xl bg-muted/20 p-4">
								<Label htmlFor="geminiApiKey">Optional Gemini API key</Label>
								<Input
									id="geminiApiKey"
									type="password"
									placeholder="Leave empty to use app-level key"
									value={portfolio.geminiApiKey}
									onChange={(event) =>
										setPortfolio((current) =>
											current
												? {
														...current,
														geminiApiKey: event.target.value,
														hasCustomGeminiKey: Boolean(
															event.target.value.trim(),
														),
													}
												: current,
										)
									}
								/>
								<p className="text-xs text-muted-foreground">
									Add your own key only if you want separate usage and limits.
								</p>
							</div>
							<div className="rounded-lg bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
								Tip: Save regularly, then open preview in a new tab to verify copy,
								spacing, and links.
							</div>
						</CardContent>
					</Card>
				</TabsContent>
				</Tabs>

				{createModal ? (
					<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4">
						<Card className="w-full max-w-lg border-border/70 shadow-xl">
							<CardHeader>
								<CardTitle className="text-lg">{createModal.title}</CardTitle>
								<CardDescription>{createModal.description}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								{createModal.kind === "header-action" ? (
									<>
										<div className="space-y-1">
											<Label>Type</Label>
											<select
												className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
												value={createForm.type ?? "github"}
												onChange={(event) => {
													const nextType = event.target.value as HeaderActionType;
													setCreateForm(getHeaderActionCreateDefaults(nextType));
												}}
											>
												<option value="github">Github</option>
												<option value="linkedin">LinkedIn</option>
												<option value="email">Email</option>
												<option value="phone">Phone</option>
												<option value="link">Custom link</option>
											</select>
										</div>
										<div className="space-y-1">
											<Label>Value</Label>
											<Input
												value={createForm.value ?? ""}
												onChange={(event) =>
													setCreateForm((current) => ({
														...current,
														value: event.target.value,
													}))
												}
												placeholder={
													createForm.type === "email"
														? "name@example.com"
														: createForm.type === "phone"
															? "+63..."
															: "https://..."
												}
											/>
										</div>
										<div className="space-y-1">
											<Label>Display</Label>
											<select
												className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
												value={createForm.display ?? "label"}
												onChange={(event) =>
													setCreateForm((current) => ({
														...current,
														display: event.target.value,
													}))
												}
											>
												<option value="label">Use label</option>
												<option value="value">Use actual value</option>
											</select>
										</div>
										<div className="space-y-1">
											<Label>Label</Label>
											<Input
												value={createForm.label ?? ""}
												onChange={(event) =>
													setCreateForm((current) => ({
														...current,
														label: event.target.value,
													}))
												}
												placeholder="Action label"
											/>
										</div>
									</>
								) : null}

								{createModal.kind === "timeline" ? (
									<>
										<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
											<div className="space-y-1">
												<Label>Year</Label>
												<Input
													value={createForm.year ?? ""}
													onChange={(event) =>
														setCreateForm((current) => ({
															...current,
															year: event.target.value,
														}))
													}
													placeholder="2026"
												/>
											</div>
											<div className="space-y-1">
												<Label>Position</Label>
												<Input
													value={createForm.position ?? ""}
													onChange={(event) =>
														setCreateForm((current) => ({
															...current,
															position: event.target.value,
														}))
													}
													placeholder="Full Stack Developer"
												/>
											</div>
										</div>
										<div className="space-y-1">
											<Label>Company</Label>
											<Input
												value={createForm.company ?? ""}
												onChange={(event) =>
													setCreateForm((current) => ({
														...current,
														company: event.target.value,
													}))
												}
												placeholder="Your Company"
											/>
										</div>
										<div className="space-y-1">
											<Label>Note</Label>
											<Input
												value={createForm.note ?? ""}
												onChange={(event) =>
													setCreateForm((current) => ({
														...current,
														note: event.target.value,
													}))
												}
												placeholder="Current role"
											/>
										</div>
									</>
								) : null}

								{createModal.kind === "experience" ? (
									<>
										<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
											<div className="space-y-1">
												<Label>Role</Label>
												<Input
													value={createForm.role ?? ""}
													onChange={(event) =>
														setCreateForm((current) => ({
															...current,
															role: event.target.value,
														}))
													}
													placeholder="Full Stack Developer"
												/>
											</div>
											<div className="space-y-1">
												<Label>Company</Label>
												<Input
													value={createForm.company ?? ""}
													onChange={(event) =>
														setCreateForm((current) => ({
															...current,
															company: event.target.value,
														}))
													}
													placeholder="Your Company"
												/>
											</div>
										</div>
										<div className="space-y-1">
											<Label>Period</Label>
											<Input
												value={createForm.period ?? ""}
												onChange={(event) =>
													setCreateForm((current) => ({
														...current,
														period: event.target.value,
													}))
												}
												placeholder="2024 — Present"
											/>
										</div>
										<div className="space-y-1">
											<Label>Highlights (one per line)</Label>
											<Textarea
												rows={4}
												value={createForm.highlights ?? ""}
												onChange={(event) =>
													setCreateForm((current) => ({
														...current,
														highlights: event.target.value,
													}))
												}
												placeholder="Built feature X..."
											/>
										</div>
									</>
								) : null}

								{createModal.kind === "tech-category" ? (
									<>
										<div className="space-y-1">
											<Label>Category mode</Label>
											<select
												className="border-input bg-background ring-offset-background h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
												value={createForm.categoryMode ?? "preset"}
												onChange={(event) =>
													setCreateForm((current) => {
														const nextMode = event.target.value;
														if (nextMode !== "preset") {
															return {
																...current,
																categoryMode: "custom",
																presetKey: "",
																name:
																	findTechCategoryPresetKeyByName(current.name ?? "")
																		? ""
																		: current.name ?? "",
															};
														}
														const fallbackPresetKey = "frontend";
														const presetKey =
															(current.presetKey as TechCategoryPresetKey) ||
															fallbackPresetKey;
														const preset = getTechCategoryPresetByKey(presetKey);
														return {
															...current,
															categoryMode: "preset",
															presetKey,
															name: preset?.label ?? "Frontend",
														};
													})
												}
											>
												<option value="preset">Use preset category</option>
												<option value="custom">Custom category (manual)</option>
											</select>
										</div>
										{(createForm.categoryMode ?? "preset") === "preset" ? (
											<div className="space-y-1">
												<Label>Preset category</Label>
												<select
													className="border-input bg-background ring-offset-background h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
													value={createForm.presetKey ?? "frontend"}
													onChange={(event) =>
														setCreateForm((current) => {
															const presetKey = event.target.value as TechCategoryPresetKey;
															const preset = getTechCategoryPresetByKey(presetKey);
															return {
																...current,
																presetKey,
																name: preset?.label ?? current.name ?? "",
															};
														})
													}
												>
													{techCategoryPresets.map((preset) => (
														<option key={`create-preset-${preset.key}`} value={preset.key}>
															{preset.label}
														</option>
													))}
												</select>
											</div>
										) : null}
										<div className="space-y-1">
											<Label>Category name</Label>
											<Input
												value={createForm.name ?? ""}
												onChange={(event) =>
													setCreateForm((current) => ({
														...current,
														name: event.target.value,
													}))
												}
												placeholder={
													(createForm.categoryMode ?? "preset") === "preset"
														? "Selected from preset"
														: "Frontend"
												}
												disabled={(createForm.categoryMode ?? "preset") === "preset"}
											/>
										</div>
										{(createForm.categoryMode ?? "preset") === "preset" ? (
											<div className="space-y-2 rounded-lg border border-border/60 bg-muted/15 p-3">
												<div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
													Preset library
												</div>
												<div className="max-h-44 overflow-y-auto pr-1">
													<div className="flex flex-wrap gap-2">
														{(
															getTechCategoryPresetByKey(
																(createForm.presetKey as TechCategoryPresetKey) || "frontend",
															)?.items ?? []
														).map((techName) => {
															const tech = getTechIcon(techName);
															const hasTech = parseTechItems(
																createForm.items ?? "",
															).some(
																(existing) =>
																	normalizeTechName(existing) ===
																	normalizeTechName(techName),
															);
															return (
																<Button
																	key={`create-preset-tech-${techName}`}
																	type="button"
																	variant={hasTech ? "secondary" : "outline"}
																	size="sm"
																	disabled={hasTech}
																	className={hasTech ? "font-semibold opacity-100" : ""}
																	onClick={() => addCreateFormTechItem(techName)}
																>
																	{tech && <tech.Icon className={tech.className} />}
																	{techName}
																	{hasTech ? " (Selected)" : ""}
																</Button>
															);
														})}
													</div>
												</div>
											</div>
										) : null}
										<div className="space-y-2 rounded-lg border border-border/60 bg-muted/15 p-3">
											<div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
												Add technology
											</div>
											<div className="flex gap-2">
												<Input
													list="create-tech-options"
													placeholder="Type technology name"
													value={createForm.techQuery ?? ""}
													onChange={(event) =>
														setCreateForm((current) => ({
															...current,
															techQuery: event.target.value,
														}))
													}
													onKeyDown={(event) => {
														if (event.key === "Enter") {
															event.preventDefault();
															addCreateFormTechItem(createForm.techQuery ?? "");
															setCreateForm((current) => ({
																...current,
																techQuery: "",
															}));
														}
													}}
												/>
												<Button
													type="button"
													variant="outline"
													onClick={() => {
														addCreateFormTechItem(createForm.techQuery ?? "");
														setCreateForm((current) => ({
															...current,
															techQuery: "",
														}));
													}}
												>
													Add
												</Button>
												<datalist id="create-tech-options">
													{searchTechOptions(
														createForm.techQuery ?? createForm.name ?? "",
														25,
													).map((option) => (
														<option key={`create-tech-opt-${option}`} value={option} />
													))}
												</datalist>
											</div>
										</div>
										{(createForm.categoryMode ?? "preset") !== "preset" ? (
											<div className="space-y-2 rounded-lg border border-border/60 bg-muted/15 p-3">
												<div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
													All technologies
												</div>
												<div className="max-h-44 overflow-y-auto pr-1">
													<div className="flex flex-wrap gap-2">
													{searchTechOptions("", 200).map(
														(techName) => {
															const tech = getTechIcon(techName);
															const hasTech = parseTechItems(
																createForm.items ?? "",
															).some(
																(existing) =>
																	normalizeTechName(existing) ===
																	normalizeTechName(techName),
															);
															return (
																<Button
																	key={`create-tech-${techName}`}
																	type="button"
																	variant={hasTech ? "secondary" : "outline"}
																	size="sm"
																	disabled={hasTech}
																	className={hasTech ? "font-semibold opacity-100" : ""}
																	onClick={() => addCreateFormTechItem(techName)}
																>
																	{tech && <tech.Icon className={tech.className} />}
																	{techName}
																	{hasTech ? " (Selected)" : ""}
																</Button>
															);
														},
													)}
													</div>
												</div>
											</div>
										) : null}
										{parseTechItems(createForm.items ?? "").length > 0 ? (
											<div className="space-y-2 rounded-lg border border-border/60 bg-background/80 p-3">
												<div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
													Selected tech (click to remove)
												</div>
												<div className="flex flex-wrap gap-2">
													{parseTechItems(createForm.items ?? "").map((techName) => {
														const icon = getTechIcon(techName);
														return (
															<Button
																key={`selected-create-tech-${techName}`}
																type="button"
																variant="ghost"
																size="sm"
																className="font-semibold"
																onClick={() => removeCreateFormTechItem(techName)}
															>
																{icon ? (
																	<icon.Icon className={icon.className} />
																) : (
																	<span className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
																		No icon
																	</span>
																)}
																{techName}
															</Button>
														);
													})}
												</div>
											</div>
										) : null}
									</>
								) : null}

								{createModal.kind === "project" ? (
									<>
										<div className="space-y-1">
											<Label>Project name</Label>
											<Input
												value={createForm.name ?? ""}
												onChange={(event) =>
													setCreateForm((current) => ({
														...current,
														name: event.target.value,
													}))
												}
												placeholder="Your Main Project"
											/>
										</div>
										<div className="space-y-1">
											<Label>Description</Label>
											<Input
												value={createForm.description ?? ""}
												onChange={(event) =>
													setCreateForm((current) => ({
														...current,
														description: event.target.value,
													}))
												}
												placeholder="Short project description"
											/>
										</div>
										<div className="space-y-1">
											<Label>Project URL</Label>
											<Input
												value={createForm.url ?? ""}
												onChange={(event) =>
													setCreateForm((current) => ({
														...current,
														url: event.target.value,
													}))
												}
												placeholder="https://..."
											/>
										</div>
									</>
								) : null}

								{createModal.kind === "custom-section" ? (
									<>
										<div className="space-y-1">
											<Label>Section title</Label>
											<Input
												value={createForm.title ?? ""}
												onChange={(event) =>
													setCreateForm((current) => ({
														...current,
														title: event.target.value,
													}))
												}
												placeholder="Section title"
											/>
										</div>
										{createModal.customSectionType === "text" ? (
											<div className="space-y-1">
												<Label>Body</Label>
												<Textarea
													rows={4}
													value={createForm.body ?? ""}
													onChange={(event) =>
														setCreateForm((current) => ({
															...current,
															body: event.target.value,
														}))
													}
													placeholder="Write your text content..."
												/>
											</div>
										) : null}
										{createModal.customSectionType === "bullets" ? (
											<div className="space-y-1">
												<Label>Bullet items (one per line)</Label>
												<Textarea
													rows={4}
													value={createForm.items ?? ""}
													onChange={(event) =>
														setCreateForm((current) => ({
															...current,
															items: event.target.value,
														}))
													}
													placeholder={"First bullet\nSecond bullet"}
												/>
											</div>
										) : null}
										{createModal.customSectionType === "links" ? (
											<>
												<div className="space-y-1">
													<Label>First link label</Label>
													<Input
														value={createForm.label ?? ""}
														onChange={(event) =>
															setCreateForm((current) => ({
																...current,
																label: event.target.value,
															}))
														}
														placeholder="My blog"
													/>
												</div>
												<div className="space-y-1">
													<Label>First link URL</Label>
													<Input
														value={createForm.url ?? ""}
														onChange={(event) =>
															setCreateForm((current) => ({
																...current,
																url: event.target.value,
															}))
														}
														placeholder="https://..."
													/>
												</div>
											</>
										) : null}
									</>
								) : null}

								{createModal.kind === "custom-bullet" ? (
									<div className="space-y-1">
										<Label>Bullet text</Label>
										<Input
											value={createForm.bullet ?? ""}
											onChange={(event) =>
												setCreateForm((current) => ({
													...current,
													bullet: event.target.value,
												}))
											}
											placeholder="Bullet item"
										/>
									</div>
								) : null}

								{createModal.kind === "custom-link" ? (
									<>
										<div className="space-y-1">
											<Label>Link label</Label>
											<Input
												value={createForm.label ?? ""}
												onChange={(event) =>
													setCreateForm((current) => ({
														...current,
														label: event.target.value,
													}))
												}
												placeholder="Resource name"
											/>
										</div>
										<div className="space-y-1">
											<Label>Link URL</Label>
											<Input
												value={createForm.url ?? ""}
												onChange={(event) =>
													setCreateForm((current) => ({
														...current,
														url: event.target.value,
													}))
												}
												placeholder="https://..."
											/>
										</div>
									</>
								) : null}

								{createModal.kind === "tech-item" ? (
									<div className="space-y-1">
										<Label>Technology name</Label>
										<Input
											value={createForm.tech ?? ""}
											onChange={(event) =>
												setCreateForm((current) => ({
													...current,
													tech: event.target.value,
												}))
											}
											placeholder="TypeScript"
										/>
									</div>
								) : null}

								<div className="flex justify-end gap-2">
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											setCreateModal(null);
											setCreateForm({});
										}}
									>
										Cancel
									</Button>
									<Button type="button" onClick={submitCreateModal}>
										Create
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				) : null}

				{previewOpen && (
					<div className="fixed inset-0 z-50 bg-black/60 p-3 sm:p-6">
						<div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
							<div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
								<div>
									<div className="text-sm font-semibold">Quick preview</div>
									<div className="text-xs text-muted-foreground">
										Live output from your current unsaved editor state.
									</div>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setPreviewOpen(false)}
								>
									Close
								</Button>
							</div>
							<div className="h-full overflow-auto p-3 sm:p-4">
								<PortfolioView portfolio={portfolio} />
							</div>
						</div>
					</div>
				)}

				{renameDialogOpen && canManageSelectedDraftVersion ? (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
						<Card className="w-full max-w-md border-border/70 shadow-xl">
							<CardHeader>
								<CardTitle className="text-lg">Rename version</CardTitle>
								<CardDescription>
									Update the version name.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<Input
									value={renameValue}
									onChange={(event) => setRenameValue(event.target.value)}
									maxLength={120}
									placeholder="Version name"
								/>
								<div className="flex justify-end gap-2">
									<Button
										type="button"
										variant="outline"
										onClick={() => setRenameDialogOpen(false)}
										disabled={renameVersionMutation.isPending}
									>
										Cancel
									</Button>
									<Button
										type="button"
										onClick={() => {
											const nextName = renameValue.trim();
											if (!nextName) {
												setToast({
													type: "error",
													message: "Version name is required.",
												});
												return;
											}
											renameVersionMutation.mutate(nextName);
										}}
										disabled={renameVersionMutation.isPending}
									>
										{renameVersionMutation.isPending ? "Saving..." : "Save name"}
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				) : null}

				{deleteDialogOpen && canManageSelectedDraftVersion ? (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
						<Card className="w-full max-w-md border-border/70 shadow-xl">
							<CardHeader>
								<CardTitle className="text-lg">Delete version?</CardTitle>
								<CardDescription>
									Delete this version? This cannot be undone.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setDeleteDialogOpen(false)}
									disabled={deleteVersionMutation.isPending}
								>
									Cancel
								</Button>
								<Button
									type="button"
									variant="destructive"
									onClick={() => deleteVersionMutation.mutate()}
									disabled={deleteVersionMutation.isPending}
								>
									{deleteVersionMutation.isPending ? "Deleting..." : "Delete"}
								</Button>
							</CardContent>
						</Card>
					</div>
				) : null}

				{isHeaderActionsEditorOpen && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3 sm:p-6">
						<div className="w-full max-w-6xl overflow-hidden rounded-2xl bg-background shadow-2xl ring-1 ring-foreground/10">
							<div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
								<div>
									<div className="text-base font-semibold">Header Actions</div>
									<div className="text-xs text-muted-foreground">
										Configure how header chips look and behave.
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() =>
											openCreateModal(
												{
													kind: "header-action",
													title: "Create Header Action",
													description: "Add a new clickable chip in your header.",
												},
												getHeaderActionCreateDefaults("github"),
											)
										}
										disabled={portfolio.headerActions.length >= MAX_HEADER_ACTIONS}
									>
										Add action
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => setIsHeaderActionsEditorOpen(false)}
									>
										<X className="size-4" />
									</Button>
								</div>
							</div>
							<div className="max-h-[78vh] overflow-y-auto px-4 py-4 sm:px-5">
								{renderHeaderActionsEditor()}
							</div>
							<div className="flex justify-end border-t px-4 py-3 sm:px-5">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setIsHeaderActionsEditorOpen(false)}
								>
									Done
								</Button>
							</div>
						</div>
					</div>
				)}

				{isCustomSectionEditorOpen && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3 sm:p-6">
					<div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-background shadow-2xl ring-1 ring-foreground/10">
						<div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
							<div>
								<div className="text-base font-semibold">Custom Section Editor</div>
								<div className="text-xs text-muted-foreground">
									Create and edit custom sections without leaving the layout flow.
								</div>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => setIsCustomSectionEditorOpen(false)}
							>
								<X className="size-4" />
							</Button>
						</div>
						<div className="max-h-[78vh] overflow-y-auto px-4 py-4 sm:px-5">
							{renderCustomSectionsEditor()}
						</div>
						<div className="flex justify-end border-t px-4 py-3 sm:px-5">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setIsCustomSectionEditorOpen(false)}
							>
								Done
							</Button>
						</div>
					</div>
				</div>
			)}
		</main>
	);
}
