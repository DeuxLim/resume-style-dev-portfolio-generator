import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
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
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Layers3 } from "lucide-react";
import GridLayout, {
	useContainerWidth,
	type Layout as GridLayoutModel,
	type LayoutItem as GridLayoutItem,
} from "react-grid-layout";
import { getAvatarUrl, resolveAssetUrl } from "@/lib/assets";
import { defaultPortfolioLayout } from "../../../shared/defaults/portfolio";
import type {
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
const SECTION_GRID_HEIGHT: Record<PortfolioSectionKey, number> = {
	about: 5,
	timeline: 6,
	experience: 7,
	tech: 6,
	projects: 6,
	heatmap: 5,
	custom: 5,
};

export default function PortfolioEditorPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const sessionQuery = useSession();
	const [portfolio, setPortfolio] = useState<EditablePortfolio | null>(null);
	const [statusMessage, setStatusMessage] = useState("");
	const [quickTechInput, setQuickTechInput] = useState<Record<string, string>>({});
	const [layoutFeedback, setLayoutFeedback] = useState("");
	const [draggingSection, setDraggingSection] = useState<PortfolioSectionKey | null>(null);
	const [canvasLayout, setCanvasLayout] = useState<GridLayoutModel>([]);
	const { width: layoutWidth, containerRef: layoutContainerRef } = useContainerWidth({
		measureBeforeMount: false,
	});
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

	const saveMutation = useMutation({
		mutationFn: async () => {
			const { data } = await api.put("/portfolios/me", { portfolio });
			return data;
		},
		onSuccess: async (data) => {
			setStatusMessage("Saved. Your active portfolio is updated.");
			setPortfolio(cloneEditablePortfolio(data.portfolio));
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio"] });
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
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

	const getLayoutOrder = (source: EditablePortfolio) =>
		source.layout?.sectionOrder?.length
			? source.layout.sectionOrder
			: defaultPortfolioLayout.sectionOrder;

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
		for (const key of defaultPortfolioLayout.sectionOrder) {
			if (!deduped.includes(key)) deduped.push(key);
		}
		return deduped;
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

	const buildGridLayoutFromPortfolio = (source: EditablePortfolio): GridLayoutModel => {
		const order = getLayoutOrder(source);
		let cursorX = 0;
		let cursorY = 0;
		let currentRowHeight = 0;

		return order.map((sectionKey) => {
			const w = getSectionSpan(source, sectionKey);
			const h = SECTION_GRID_HEIGHT[sectionKey] ?? 6;

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
				minH: 4,
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
		return `${order}__${spans}`;
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

			return {
				...current,
				layout: {
					sectionOrder: nextOrder,
					sectionSpans: nextSpans,
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
								<p className="text-sm text-(--app-muted) whitespace-pre-wrap">
									{section.body}
								</p>
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

	if (sessionQuery.isLoading || portfolioQuery.isLoading) {
		return <div className="app-card p-6">Loading editor...</div>;
	}
	if (!portfolio) return null;

	return (
		<main className="space-y-5 pb-10">
			<Card className="border-border/70 bg-gradient-to-br from-violet-500/12 via-sky-500/8 to-transparent shadow-none">
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
						<Link to="/dashboard" className={buttonVariants({ variant: "outline" })}>
							Back to manager
						</Link>
						<Link
							to={`/${portfolio.username}`}
							target="_blank"
							rel="noreferrer noopener"
							className={buttonVariants({ variant: "ghost" })}
						>
							Open preview
						</Link>
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

			<Tabs defaultValue="profile" className="space-y-4">
				<TabsList className="w-full justify-start" variant="line">
					<TabsTrigger value="profile">Profile</TabsTrigger>
					<TabsTrigger value="story">Story</TabsTrigger>
					<TabsTrigger value="career">Career</TabsTrigger>
					<TabsTrigger value="stack">Stack & Projects</TabsTrigger>
					<TabsTrigger value="layout">Layout</TabsTrigger>
					<TabsTrigger value="extras">Extras</TabsTrigger>
				</TabsList>

				<TabsContent value="profile" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<Card className="border-border/70 shadow-none">
						<CardHeader>
							<CardTitle>Identity</CardTitle>
							<CardDescription>Your name, headline, and contact basics.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{[
								["fullName", "Full name"],
								["headline", "Headline"],
								["location", "Location"],
								["experienceSummary", "Experience summary"],
								["education", "Education"],
								["availability", "Availability"],
								["phone", "Phone"],
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
								</div>
							))}
						</CardContent>
					</Card>

					<Card className="border-border/70 shadow-none">
						<CardHeader>
							<CardTitle>Links & Visuals</CardTitle>
							<CardDescription>
								Set your profile image and social destinations.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="space-y-2 rounded-lg border p-3">
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
							<div className="space-y-2 rounded-lg border p-3">
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
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="story" className="space-y-4">
					<Card className="border-border/70 shadow-none">
						<CardHeader>
							<CardTitle>About section</CardTitle>
							<CardDescription>
								Write short paragraphs focused on impact and clarity.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{portfolio.about.map((paragraph, index) => (
								<div key={index} className="space-y-2 rounded-lg border p-3">
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
							))}
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

				<TabsContent value="career" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
					<Card className="border-border/70 shadow-none">
						<CardHeader>
							<CardTitle>Timeline</CardTitle>
							<CardDescription>Career milestones and key dates.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
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
							{portfolio.timeline.map((item) => (
								<div key={item.id} className="space-y-2 rounded-lg border p-3">
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
							))}
						</CardContent>
					</Card>

					<Card className="border-border/70 shadow-none">
						<CardHeader>
							<CardTitle>Experience</CardTitle>
							<CardDescription>Roles, periods, and achievements.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() =>
									setPortfolio((current) =>
										current
											? {
													...current,
													experiences: [...current.experiences, createExperienceItem()],
												}
											: current,
									)
								}
							>
								Add role
							</Button>
							{portfolio.experiences.map((item) => (
								<div key={item.id} className="space-y-2 rounded-lg border p-3">
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
							))}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="stack" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
					<Card className="border-border/70 shadow-none">
						<CardHeader>
							<CardTitle>Tech stack</CardTitle>
							<CardDescription>Group skills by category.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
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
							{portfolio.techCategories.map((item) => (
								<div key={item.id} className="space-y-2 rounded-lg border p-3">
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
														variant="outline"
														size="sm"
														disabled={hasTech}
														onClick={() => addTechToCategory(item.id, techName)}
													>
														{tech && <tech.Icon className={tech.className} />}
														{techName}
													</Button>
												);
											})}
										</div>
									</div>
									{item.items.length > 0 && (
										<div className="flex flex-wrap gap-2">
											{item.items.map((techName, techIndex) => (
												<Button
													key={`${item.id}-${techName}-${techIndex}`}
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => removeTechFromCategory(item.id, techName)}
												>
													{techName}
												</Button>
											))}
										</div>
									)}
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
							))}
						</CardContent>
					</Card>

					<Card className="border-border/70 shadow-none">
						<CardHeader>
							<CardTitle>Projects</CardTitle>
							<CardDescription>Showcase your strongest work.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
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
							{portfolio.projects.map((item) => (
								<div key={item.id} className="space-y-2 rounded-lg border p-3">
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
							))}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="layout" className="space-y-4">
					<Card className="border-border/70 shadow-none">
						<CardHeader>
							<CardTitle>Layout canvas</CardTitle>
							<CardDescription>
								Drag anywhere on each block to reposition. Resize from the bottom-right
								handle to change width.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div
								ref={layoutContainerRef}
								className="overflow-x-hidden rounded-xl border bg-muted/20 p-2"
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
											className={`h-full overflow-hidden rounded-xl border bg-background ${
												draggingSection === sectionKey ? "ring-2 ring-(--app-accent)" : ""
											}`}
										>
											<div className="mb-2 flex items-center justify-between gap-2 border-b px-3 py-2">
												<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
													{SECTION_META[sectionKey].title}
												</div>
												<div className="text-[11px] text-muted-foreground">
													{getSectionSpan(portfolio, sectionKey)} / 12
												</div>
											</div>
											<div className="pointer-events-none h-[calc(100%-44px)] min-w-0 overflow-auto overflow-x-hidden px-3 pb-3 [overflow-wrap:anywhere]">
												{getCanvasSectionContent(sectionKey, portfolio)}
											</div>
										</div>
									))}
								</GridLayout>
							</div>
							<div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
								Drag any card directly. The card itself is the placement preview, and
								sibling blocks reflow in real time.
							</div>
							<div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
								If a move or resize is constrained, you will see a hint after drop.
								Resize from the bottom-right corner to change card width.
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
														},
													}
												: current,
										);
										setLayoutFeedback("Reset to default order and width.");
									}}
								>
									Reset to default layout
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
							</div>

							{layoutFeedback && (
								<div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
									{layoutFeedback}
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="extras" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
					<Card className="border-border/70 shadow-none">
						<CardHeader>
							<CardTitle>Custom sections</CardTitle>
							<CardDescription>Add extra content blocks.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() =>
									setPortfolio((current) =>
										current
											? {
													...current,
													customSections: [...current.customSections, createCustomSection()],
												}
											: current,
									)
								}
							>
								Add section
							</Button>
							{portfolio.customSections.map((item) => (
								<div key={item.id} className="space-y-2 rounded-lg border p-3">
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
							))}
						</CardContent>
					</Card>

					<Card className="border-border/70 shadow-none">
						<CardHeader>
							<CardTitle>AI & chat</CardTitle>
							<CardDescription>Control assistant features for this portfolio.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center gap-3 rounded-lg border p-3">
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
							<div className="space-y-2">
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
							<div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
								Tip: Save regularly, then open preview in a new tab to verify copy,
								spacing, and links.
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</main>
	);
}
