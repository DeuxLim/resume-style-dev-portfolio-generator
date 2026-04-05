import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios.client";
import { sessionQueryKey, useSession } from "@/hooks/useSession";
import {
	cloneEditablePortfolio,
	createCustomSection,
	createExperienceItem,
	createProjectItem,
	createTechCategory,
	createTimelineItem,
} from "@/lib/portfolio";
import {
	getSuggestedTechForCategory,
	getTechIcon,
	normalizeTechName,
	searchTechOptions,
} from "@/lib/tech";
import type { EditablePortfolio } from "../../../shared/types/portfolio.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
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
import { ChevronDown, ChevronUp, Layers3, X } from "lucide-react";
import GridLayout, {
	type Layout as GridLayoutModel,
	type LayoutItem as GridLayoutItem,
} from "react-grid-layout";
import { getAvatarUrl, resolveAssetUrl } from "@/lib/assets";
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

export default function PortfolioEditorPage() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const queryClient = useQueryClient();
	const sessionQuery = useSession();
	const shouldCreateVersionOnSave = searchParams.get("newVersion") === "1";
	const [portfolio, setPortfolio] = useState<EditablePortfolio | null>(null);
	const [statusMessage, setStatusMessage] = useState("");
	const [quickTechInput, setQuickTechInput] = useState<Record<string, string>>({});
	const [layoutFeedback, setLayoutFeedback] = useState("");
	const [draggingSection, setDraggingSection] = useState<PortfolioSectionKey | null>(null);
	const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});
	const [pendingFocusExperienceId, setPendingFocusExperienceId] = useState<string | null>(
		null,
	);
	const [isCustomSectionEditorOpen, setIsCustomSectionEditorOpen] = useState(false);
	const [layoutWidth, setLayoutWidth] = useState(0);
	const [canvasLayout, setCanvasLayout] = useState<GridLayoutModel>([]);
	const [activeTab, setActiveTab] = useState("profile");
	const [pendingAutoFit, setPendingAutoFit] = useState(false);
	const layoutContainerRef = useRef<HTMLDivElement | null>(null);
	const sectionContentRefs = useRef<
		Partial<Record<PortfolioSectionKey, HTMLDivElement | null>>
	>(
		{},
	);
	const experienceItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const hasAutoFittedDefaultLayout = useRef(false);
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

	useEffect(() => {
		if (sessionQuery.isSuccess && !sessionQuery.data?.user) {
			navigate("/login");
		}
	}, [navigate, sessionQuery.data, sessionQuery.isSuccess]);

	useEffect(() => {
		if (portfolioQuery.data) {
			setPortfolio(cloneEditablePortfolio(portfolioQuery.data));
		}
	}, [portfolioQuery.data]);

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

	const isDefaultLayoutConfig = (source: EditablePortfolio) => {
		const currentOrder = getLayoutOrder(source);
		const defaultOrder = defaultPortfolioLayout.sectionOrder;
		if (currentOrder.length !== defaultOrder.length) return false;
		for (let i = 0; i < defaultOrder.length; i += 1) {
			if (currentOrder[i] !== defaultOrder[i]) return false;
		}
		for (const section of defaultOrder) {
			if (getSectionSpan(source, section) !== defaultPortfolioLayout.sectionSpans[section]) {
				return false;
			}
			if (getSectionHeight(source, section) !== defaultPortfolioLayout.sectionHeights[section]) {
				return false;
			}
		}
		return true;
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
		if (activeTab !== "layout" || !portfolio) return;
		if (hasAutoFittedDefaultLayout.current) return;
		if (!isDefaultLayoutConfig(portfolio)) return;
		hasAutoFittedDefaultLayout.current = true;
		setPendingAutoFit(true);
	}, [activeTab, portfolio]);

	const saveMutation = useMutation({
		mutationFn: async () => {
			if (!portfolio) {
				throw new Error("Portfolio data is not ready.");
			}

			const { data } = await api.put<{ portfolio: EditablePortfolio }>(
				"/portfolios/me",
				{ portfolio },
			);

			let createdVersion = false;
			let versionCreateFailed = false;

			if (shouldCreateVersionOnSave) {
				try {
					await api.post("/portfolios/me/versions", {});
					createdVersion = true;
				} catch {
					versionCreateFailed = true;
				}
			}

			return { portfolio: data.portfolio, createdVersion, versionCreateFailed };
		},
		onSuccess: async (result) => {
			if (result.versionCreateFailed) {
				setStatusMessage(
					"Saved active portfolio, but failed to create a new version. Save again to retry.",
				);
			} else if (result.createdVersion) {
				setStatusMessage("Saved. New version created.");
			} else {
				setStatusMessage("Saved. Your active portfolio is updated.");
			}

			setPortfolio(cloneEditablePortfolio(result.portfolio));
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio"] });
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });

			if (result.createdVersion) {
				await queryClient.invalidateQueries({ queryKey: ["my-portfolio-versions"] });
				const nextSearchParams = new URLSearchParams(searchParams);
				nextSearchParams.delete("newVersion");
				setSearchParams(nextSearchParams, { replace: true });
			}
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
			setStatusMessage("Profile photo uploaded.");
			setPortfolio(cloneEditablePortfolio(data.portfolio));
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio"] });
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
		},
		onError: () => {
			setStatusMessage("Upload failed. Please use JPG, PNG, WEBP, or GIF under 3MB.");
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
			setStatusMessage("Cover image uploaded.");
			setPortfolio(cloneEditablePortfolio(data.portfolio));
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio"] });
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
		},
		onError: () => {
			setStatusMessage("Upload failed. Please use JPG, PNG, WEBP, or GIF under 5MB.");
		},
	});

	const setBasicField = (
		key:
			| "fullName"
			| "headline"
			| "location"
			| "experienceSummary"
			| "education"
			| "availability"
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

	const addQuickTechToCategory = (categoryId: string) => {
		const rawValue = quickTechInput[categoryId] ?? "";
		const value = rawValue.trim();
		if (!value) return;
		addTechToCategory(categoryId, value);
		setQuickTechInput((current) => ({ ...current, [categoryId]: "" }));
	};

	const togglePanel = (panelId: string) => {
		setOpenPanels((current) => ({ ...current, [panelId]: !current[panelId] }));
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
		source.layout?.sectionOrder?.length
			? source.layout.sectionOrder
			: defaultPortfolioLayout.sectionOrder;

	const getHiddenSections = (source: EditablePortfolio) => {
		const active = new Set(getLayoutOrder(source));
		return defaultPortfolioLayout.sectionOrder.filter((section) => !active.has(section));
	};

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

	const addCustomSectionWithType = (type: CustomSection["type"] = "text") => {
		let wasAdded = false;
		setPortfolio((current) => {
			if (!current) return current;
			if (current.customSections.length >= MAX_CUSTOM_SECTIONS) return current;
			const section = createCustomSection();
			section.type = type;
			section.body = type === "text" ? "" : section.body;
			section.items = type === "bullets" ? [""] : [];
			section.links =
				type === "links" ? [{ id: `${Date.now()}-link`, label: "", url: "" }] : [];
			wasAdded = true;
			const nextOrder: PortfolioSectionKey[] = getLayoutOrder(current).includes("custom")
				? getLayoutOrder(current)
				: [...getLayoutOrder(current), "custom"];
			return {
				...current,
				customSections: [...current.customSections, section],
				layout: {
					...current.layout,
					sectionOrder: nextOrder,
				},
			};
		});
		if (!wasAdded) {
			setLayoutFeedback(`Custom sections limit reached (${MAX_CUSTOM_SECTIONS}).`);
			return;
		}
		setPendingAutoFit(true);
		setLayoutFeedback("Created a custom section. Edit its content below.");
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
						onClick={() => addCustomSectionWithType("text")}
					>
						Add text section
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={portfolio.customSections.length >= MAX_CUSTOM_SECTIONS}
						onClick={() => addCustomSectionWithType("bullets")}
					>
						Add bullet list
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={portfolio.customSections.length >= MAX_CUSTOM_SECTIONS}
						onClick={() => addCustomSectionWithType("links")}
					>
						Add links section
					</Button>
				</div>
				<div className="text-xs text-muted-foreground">
					{portfolio.customSections.length} / {MAX_CUSTOM_SECTIONS} custom sections
				</div>
				<div className="max-h-[34rem] space-y-4 overflow-y-auto pr-1">
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
												setPortfolio((current) =>
													current
														? {
																...current,
																customSections: current.customSections.map((entry) =>
																	entry.id === item.id
																		? { ...entry, items: [...entry.items, ""] }
																		: entry,
																),
															}
														: current,
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
												setPortfolio((current) =>
													current
														? {
																...current,
																customSections: current.customSections.map((entry) =>
																	entry.id === item.id
																		? {
																				...entry,
																				links: [
																					...entry.links,
																					{ id: `${Date.now()}-link`, label: "", url: "" },
																				],
																			}
																		: entry,
																),
															}
														: current,
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

	if (sessionQuery.isLoading || portfolioQuery.isLoading) {
		return <div className="app-card p-6">Loading editor...</div>;
	}
	if (!portfolio) return null;

	return (
		<main className="space-y-5 pb-10">
			<Card className="bg-gradient-to-br from-violet-500/12 via-sky-500/8 to-transparent shadow-none">
				<CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
					<div className="space-y-2">
						<Badge variant="secondary" className="w-fit">
							<Layers3 className="mr-1 size-3.5" />
							Portfolio Editor
						</Badge>
						<CardTitle className="text-2xl sm:text-3xl">
							Craft your best public profile
						</CardTitle>
						<CardDescription>
							Public URL: <span className="font-medium">/{portfolio.username}</span>
						</CardDescription>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							onClick={() => saveMutation.mutate()}
							disabled={saveMutation.isPending}
						>
							{saveMutation.isPending ? "Saving..." : "Save changes"}
						</Button>
					</div>
				</CardHeader>
				{statusMessage && (
					<CardContent>
						<div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
							{statusMessage}
						</div>
					</CardContent>
				)}
			</Card>

			<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-7">
				<TabsList
					className="w-full justify-start gap-1 overflow-x-auto rounded-xl bg-background/80 p-1"
					variant="line"
				>
					<TabsTrigger value="profile">Profile</TabsTrigger>
					<TabsTrigger value="story">Story</TabsTrigger>
					<TabsTrigger value="career">Career</TabsTrigger>
					<TabsTrigger value="stack">Stack & Projects</TabsTrigger>
					<TabsTrigger value="layout">Layout</TabsTrigger>
					<TabsTrigger value="extras">Extras</TabsTrigger>
				</TabsList>

				<TabsContent value="profile" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>Identity</CardTitle>
							<CardDescription>Your name, headline, and contact basics.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{[
								["fullName", "Full name"],
								["headline", "Headline"],
								["location", "Location"],
								["experienceSummary", "Experience summary"],
								["education", "Education"],
								["availability", "Availability"],
								["phone", "Phone"],
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
								Set your profile image and social destinations.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2 rounded-lg bg-muted/20 p-4">
								<Label>Profile photo</Label>
								<div className="flex items-center gap-3">
									<img
										src={getAvatarUrl(portfolio.avatarUrl)}
										alt={portfolio.fullName}
										className="size-16 rounded-full border object-cover"
									/>
									<div className="space-y-2">
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
									<div className="flex flex-wrap gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => coverInputRef.current?.click()}
											disabled={uploadCoverMutation.isPending}
										>
											{uploadCoverMutation.isPending ? "Uploading..." : "Upload cover"}
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
								<div className="mb-3 text-sm font-medium">Profile links</div>
								<div className="space-y-3">
									{[
								["avatarUrl", "Avatar image URL"],
								["coverUrl", "Cover image URL"],
								["githubUrl", "GitHub URL (optional)"],
								["githubUsername", "GitHub username (optional)"],
								["linkedinUrl", "LinkedIn URL"],
									].map(([key, label]) => (
										<div key={key} className="space-y-2">
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
											{key === "coverUrl" &&
												Boolean(String(portfolio.coverUrl ?? "").trim()) && (
												<div className="overflow-hidden rounded-md border">
													<img
														src={resolveAssetUrl(String(portfolio.coverUrl ?? ""))}
														alt="Cover preview"
														className="h-24 w-full object-cover"
													/>
												</div>
											)}
										</div>
									))}
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="story" className="space-y-6">
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>About section</CardTitle>
							<CardDescription>
								Write short paragraphs focused on impact and clarity.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="max-h-[30rem] space-y-4 overflow-y-auto pr-1">
								{portfolio.about.map((paragraph, index) => {
								const panelId = `about-${index}`;
								const isOpen = openPanels[panelId] ?? index === 0;
								return (
								<div key={index} className="space-y-3 rounded-xl bg-muted/20 p-4">
									<div className="flex items-center justify-between gap-2">
										<div className="text-xs font-medium text-muted-foreground">
											Paragraph {index + 1}
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
																	about: current.about.filter((_, i) => i !== index),
																}
															: current,
													)
												}
											>
												Remove paragraph
											</Button>
										</div>
									</div>
									{!isOpen ? (
										<div className="rounded-lg bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
											{paragraph?.trim() ? paragraph : "No content yet."}
										</div>
									) : (
										<Textarea
											value={paragraph}
											rows={4}
											onChange={(event) =>
												setPortfolio((current) => {
													if (!current) return current;
													const next = [...current.about];
													next[index] = event.target.value;
													return { ...current, about: next };
												})
											}
										/>
									)}
								</div>
								);
							})}
							</div>
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									setPortfolio((current) =>
										current
											? { ...current, about: [...current.about, ""] }
											: current,
									)
								}
							>
								Add paragraph
							</Button>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="career" className="grid grid-cols-1 gap-6 xl:grid-cols-2">
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>Timeline</CardTitle>
							<CardDescription>Career milestones and key dates.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() =>
									setPortfolio((current) =>
										current
											? { ...current, timeline: [...current.timeline, createTimelineItem()] }
											: current,
									)
								}
							>
								Add timeline item
							</Button>
							<div className="max-h-[30rem] space-y-4 overflow-y-auto pr-1">
								{portfolio.timeline.map((item, index) => {
								const panelId = `timeline-${item.id}`;
								const isOpen = openPanels[panelId] ?? index === 0;
								return (
								<div key={item.id} className="space-y-3 rounded-xl bg-muted/20 p-4">
									<div className="flex items-center justify-between gap-2">
										<div className="space-y-0.5">
											<div className="text-xs font-medium text-muted-foreground">
												Timeline item {index + 1}
											</div>
											<div className="text-sm font-medium">
												{item.position || item.company || "Untitled milestone"}
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
										<div className="rounded-lg bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
											{[item.year, item.position, item.company].filter(Boolean).join(" • ") ||
												"No details yet."}
										</div>
									) : (
										<>
											<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
												<Input
													placeholder="Year"
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
												<Input
													placeholder="Position"
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
											<Input
												placeholder="Company"
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
											<Input
												placeholder="Note"
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
										</>
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
						<CardContent className="space-y-4">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => {
									const newItem = createExperienceItem();
									setPortfolio((current) =>
										current
											? {
													...current,
													experiences: [...current.experiences, newItem],
												}
											: current,
									);
									setOpenPanels((current) => ({
										...current,
										[`experience-${newItem.id}`]: true,
									}));
									setPendingFocusExperienceId(newItem.id);
								}}
							>
								Add role
							</Button>
							<div className="max-h-[30rem] space-y-4 overflow-y-auto pr-1">
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
									className="space-y-3 rounded-xl bg-muted/20 p-4 outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent)"
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
										<div className="rounded-lg bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
											{[item.role, item.company, item.period].filter(Boolean).join(" • ") ||
												"No details yet."}
										</div>
									) : (
										<>
											<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
												<Input
													placeholder="Role"
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
												<Input
													placeholder="Company"
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
											<Input
												placeholder="Period"
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
											<Textarea
												placeholder="One highlight per line"
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
										</>
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
							<CardTitle>Tech stack</CardTitle>
							<CardDescription>Group skills by category.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() =>
									setPortfolio((current) =>
										current
											? {
													...current,
													techCategories: [...current.techCategories, createTechCategory()],
												}
											: current,
									)
								}
							>
								Add category
							</Button>
							<div className="max-h-[30rem] space-y-4 overflow-y-auto pr-1">
								{portfolio.techCategories.map((item, index) => {
								const panelId = `tech-${item.id}`;
								const isOpen = openPanels[panelId] ?? index === 0;
								return (
								<div key={item.id} className="space-y-3 rounded-xl bg-muted/20 p-4">
									<div className="flex items-center justify-between gap-2">
										<div className="space-y-0.5">
											<div className="text-xs font-medium text-muted-foreground">
												Category {index + 1}
											</div>
											<div className="text-sm font-medium">
												{item.name || "Untitled category"}
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
										<div className="rounded-lg bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
											{item.items.length} tech item{item.items.length === 1 ? "" : "s"}
										</div>
									) : (
										<>
											<Input
												placeholder="Category name"
												value={item.name}
												onChange={(event) =>
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
													)
												}
											/>
											<Input
												placeholder="React, TypeScript, Tailwind"
												value={item.items.join(", ")}
												onChange={(event) =>
													setPortfolio((current) =>
														current
															? {
																	...current,
																	techCategories: current.techCategories.map((entry) =>
																		entry.id === item.id
																			? {
																					...entry,
																					items: event.target.value
																						.split(",")
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
											<div className="space-y-2">
												<div className="text-xs text-muted-foreground">Search and add</div>
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
																addQuickTechToCategory(item.id);
															}
														}}
													/>
													<Button
														type="button"
														variant="outline"
														onClick={() => addQuickTechToCategory(item.id)}
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
											<div className="space-y-2">
												<div className="text-xs text-muted-foreground">Quick add</div>
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
											{item.items.length > 0 && (
												<div className="space-y-2 rounded-lg bg-background/70 p-3">
													<div className="text-xs font-medium text-muted-foreground">
														Selected tech (click to remove)
													</div>
													<div className="flex flex-wrap gap-2">
														{item.items.map((techName, techIndex) => (
															<Button
																key={`${item.id}-${techName}-${techIndex}`}
																type="button"
																variant="ghost"
																size="sm"
																className="font-semibold"
																onClick={() => removeTechFromCategory(item.id, techName)}
															>
																{techName}
															</Button>
														))}
													</div>
												</div>
											)}
										</>
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
						<CardContent className="space-y-4">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() =>
									setPortfolio((current) =>
										current
											? { ...current, projects: [...current.projects, createProjectItem()] }
											: current,
									)
								}
							>
								Add project
							</Button>
							<div className="max-h-[30rem] space-y-4 overflow-y-auto pr-1">
								{portfolio.projects.map((item, index) => {
								const panelId = `project-${item.id}`;
								const isOpen = openPanels[panelId] ?? index === 0;
								return (
								<div key={item.id} className="space-y-3 rounded-xl bg-muted/20 p-4">
									<div className="flex items-center justify-between gap-2">
										<div className="space-y-0.5">
											<div className="text-xs font-medium text-muted-foreground">
												Project {index + 1}
											</div>
											<div className="text-sm font-medium">
												{item.name || "Untitled project"}
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
										<div className="rounded-lg bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
											{item.description?.trim() || item.url?.trim() || "No details yet."}
										</div>
									) : (
										<>
											<Input
												placeholder="Project name"
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
											<Input
												placeholder="Short description"
												value={item.description}
												onChange={(event) =>
													setPortfolio((current) =>
														current
															? {
																	...current,
																	projects: current.projects.map((entry) =>
																		entry.id === item.id
																			? { ...entry, description: event.target.value }
																			: entry,
																	),
																}
															: current,
													)
												}
											/>
											<Input
												placeholder="Project URL"
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
										</>
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
							<CardTitle>Layout canvas</CardTitle>
							<CardDescription>
								Drag from each block header to reposition. Resize from the bottom-right
								handle to change width.
							</CardDescription>
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
										handle: ".layout-drag-handle",
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
											className={`h-full overflow-hidden rounded-xl bg-background ${
												draggingSection === sectionKey ? "ring-2 ring-(--app-accent)" : ""
											}`}
										>
											<div className="layout-drag-handle mb-2 flex cursor-move items-center justify-between gap-2 bg-muted/35 px-3 py-2">
												<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
													{SECTION_META[sectionKey].title}
												</div>
												<div className="flex items-center gap-2">
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
											</div>
											<div
												ref={(node) => {
													sectionContentRefs.current[sectionKey] = node;
												}}
												className="layout-scroll-content h-[calc(100%-44px)] min-w-0 max-w-full overflow-auto px-3 pb-3 [overflow-wrap:anywhere]"
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
							<CardTitle>Custom sections</CardTitle>
							<CardDescription>Add extra content blocks.</CardDescription>
						</CardHeader>
						<CardContent>{renderCustomSectionsEditor()}</CardContent>
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
