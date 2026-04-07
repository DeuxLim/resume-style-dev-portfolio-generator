import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiBaseUrl } from "@/lib/axios.client";
import { useSession } from "@/hooks/useSession";
import { usePinnedSidebar } from "@/hooks/usePinnedSidebar";
import {
	cloneResume,
	createResumeListItem,
	getResumeValidation,
	moveSection,
	resetResumeLayout,
	resumeSections,
} from "@/lib/resume";
import type {
	ResumeRecord,
	ResumeSectionKey,
	ResumeStructuredListItem,
	ResumeTemplateKey,
	ResumeValidationResult,
} from "../../../shared/types/resume.types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
	ArrowDown,
	ArrowUp,
	Download,
	Eye,
	FileText,
	Save,
	Shuffle,
	Trash2,
} from "lucide-react";

const sectionTitleByKey: Record<ResumeSectionKey, string> = {
	header: "Header",
	summary: "Summary",
	experience: "Experience",
	education: "Education",
	skills: "Skills",
	projects: "Projects",
	certifications: "Certifications",
	awards: "Awards",
	volunteer: "Volunteer",
	languages: "Languages",
	publications: "Publications",
	custom: "Custom",
};

const listSections: Array<{
	key: "certifications" | "awards" | "volunteer" | "publications" | "custom";
	title: string;
}> = [
	{ key: "certifications", title: "Certifications" },
	{ key: "awards", title: "Awards" },
	{ key: "volunteer", title: "Volunteer" },
	{ key: "publications", title: "Publications" },
	{ key: "custom", title: "Custom" },
];

const resumeTemplateOptions: Array<{ key: ResumeTemplateKey; label: string }> = [
	{ key: "ats_classic_v1", label: "ATS Classic (Default)" },
	{ key: "harvard_classic_v1", label: "Harvard Classic" },
];

const makeId = () =>
	typeof crypto !== "undefined" && "randomUUID" in crypto
		? crypto.randomUUID()
		: `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const editorCardClassName = "border-border/70 shadow-none";
const contentSectionCardClassName = `${editorCardClassName} scroll-mt-24`;
const itemBlockClassName = "space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3";

export default function ResumeBuilderPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const sessionQuery = useSession();
	const [resume, setResume] = useState<ResumeRecord | null>(null);
	const [toast, setToast] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);
	const [activeTab, setActiveTab] = useState("content");
	const [previewOpen, setPreviewOpen] = useState(false);
	const [shortcutsOpen, setShortcutsOpen] = useState(false);
	const [resetLayoutDialogOpen, setResetLayoutDialogOpen] = useState(false);
	const [activeContentSection, setActiveContentSection] = useState(
		"resume-content-header",
	);
	const { shellRef: navShellRef, asideRef: navAsideRef, pinnedStyle } = usePinnedSidebar({
		enabled: activeTab === "content",
		topOffset: 96,
		minWidth: 768,
		defaultWidth: 220,
	});

	useEffect(() => {
		if (!toast) return;
		const timeoutId = window.setTimeout(() => setToast(null), 2400);
		return () => window.clearTimeout(timeoutId);
	}, [toast]);

	useEffect(() => {
		if (sessionQuery.isSuccess && !sessionQuery.data?.user) {
			navigate("/login");
		}
	}, [navigate, sessionQuery.data, sessionQuery.isSuccess]);

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

	useEffect(() => {
		if (!resumeQuery.data) return;
		setResume(cloneResume(resumeQuery.data.resume));
	}, [resumeQuery.data]);

	const liveValidation = useMemo(
		() => (resume ? getResumeValidation(resume) : null),
		[resume],
	);

	const summaryWarnings = useMemo(() => {
		if (!resume) return [];
		const warnings: string[] = [];
		if (resume.content.summary.length > 300) {
			warnings.push("Summary is longer than recommended (300 chars).");
		}
		if (resume.content.summary.length > 600) {
			warnings.push("Summary exceeds max length (600 chars).");
		}
		return warnings;
	}, [resume?.content.summary]);

	const skillsWarnings = useMemo(() => {
		if (!resume) return [];
		const warnings: string[] = [];
		const count = resume.content.skills.length;
		if (count < 8 || count > 24) {
			warnings.push("8-24 skills is recommended.");
		}
		if (count > 40) {
			warnings.push("Skills exceed max (40).");
		}
		return warnings;
	}, [resume?.content.skills]);

	const contentSectionNav = useMemo(
		() => [
			{ id: "resume-content-header", label: "Header" },
			{ id: "resume-content-summary", label: "Summary" },
			{ id: "resume-content-skills", label: "Skills" },
			{ id: "resume-content-experience", label: "Experience" },
			{ id: "resume-content-education", label: "Education" },
			{ id: "resume-content-projects", label: "Projects" },
			{ id: "resume-content-languages", label: "Languages" },
			...listSections.map((section) => ({
				id: `resume-content-${section.key}`,
				label: section.title,
			})),
		],
		[],
	);

	const saveMutation = useMutation({
		mutationFn: async () => {
			const { data } = await api.put<{ resume: ResumeRecord; validation: ResumeValidationResult }>(
				"/resumes/me",
				{ resume },
			);
			return data;
		},
		onSuccess: async (data) => {
			setToast({ type: "success", message: "Resume saved." });
			setResume(cloneResume(data.resume));
			await queryClient.invalidateQueries({ queryKey: ["my-resume"] });
		},
		onError: () => {
			setToast({ type: "error", message: "Failed to save resume." });
		},
	});

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const isMeta = event.ctrlKey || event.metaKey;
			const key = event.key.toLowerCase();
			const isSaveKey = isMeta && key === "s" && !event.altKey;
			const isPreviewKey = isMeta && event.shiftKey && key === "p";
			if (isSaveKey) {
				event.preventDefault();
				if (!resume || saveMutation.isPending) return;
				saveMutation.mutate();
				return;
			}
			if (isPreviewKey) {
				event.preventDefault();
				setPreviewOpen(true);
				return;
			}
			if (key === "escape") {
				setPreviewOpen(false);
				setShortcutsOpen(false);
				setResetLayoutDialogOpen(false);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [resume, saveMutation]);

	useEffect(() => {
		if (activeTab !== "content") return;
		const sections = contentSectionNav
			.map((entry) => document.getElementById(entry.id))
			.filter((entry): entry is HTMLElement => Boolean(entry));
		if (!sections.length) return;
		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((entry) => entry.isIntersecting)
					.sort(
						(a, b) =>
							a.boundingClientRect.top - b.boundingClientRect.top,
					);
				if (!visible.length) return;
				setActiveContentSection(visible[0].target.id);
			},
			{
				root: null,
				rootMargin: "-20% 0px -65% 0px",
				threshold: [0, 0.25, 0.5, 1],
			},
		);
		for (const section of sections) observer.observe(section);
		return () => observer.disconnect();
	}, [activeTab, contentSectionNav]);

	if (resumeQuery.isLoading || !resume) {
		return <div className="app-card p-6">Loading resume builder...</div>;
	}

	const pdfDownloadHref = `${apiBaseUrl}/resumes/me/pdf?download=1`;
	const pdfInlineHref = `${apiBaseUrl}/resumes/me/pdf?ts=${encodeURIComponent(
		resume.updatedAt ?? String(Date.now()),
	)}`;
	const visibleSectionOrder = resume.layout.sectionOrder.filter((section) =>
		section === "header" ? true : Boolean(resume.layout.visibility[section]),
	);

	const renderInlineWarnings = (messages: string[]) => {
		if (!messages.length) return null;
		return (
			<ul className="mt-2 list-disc pl-5 text-xs text-amber-600 space-y-1">
				{messages.map((message, index) => (
					<li key={`${message}-${index}`}>{message}</li>
				))}
			</ul>
		);
	};

	const getExperienceWarnings = (bullets: string[]) => {
		const warnings: string[] = [];
		if (bullets.length < 3 || bullets.length > 6) {
			warnings.push("3-6 bullets per role is recommended.");
		}
		if (bullets.length > 8) {
			warnings.push("Max 8 bullets per role.");
		}
		if (bullets.some((bullet) => bullet.length > 140)) {
			warnings.push("One or more bullets are longer than recommended (140 chars).");
		}
		if (bullets.some((bullet) => bullet.length > 220)) {
			warnings.push("One or more bullets exceed max length (220 chars).");
		}
		return warnings;
	};

	const getCustomWarnings = (details: string[]) => {
		const body = details.join(" ").trim();
		const warnings: string[] = [];
		if (!body) return warnings;
		if (body.length > 300) {
			warnings.push("Custom details are longer than recommended (300 chars).");
		}
		if (body.length > 500) {
			warnings.push("Custom details exceed max length (500 chars).");
		}
		return warnings;
	};

	const setHeaderField = (key: keyof ResumeRecord["content"]["header"], value: string) => {
		setResume((current) =>
			current
				? {
						...current,
						content: {
							...current.content,
							header: { ...current.content.header, [key]: value },
						},
				  }
				: current,
		);
	};

	const updateListSection = (
		section: keyof ResumeRecord["content"],
		index: number,
		field: keyof ResumeStructuredListItem,
		value: string,
	) => {
		setResume((current) => {
			if (!current) return current;
			const nextItems = [...(current.content[section] as ResumeStructuredListItem[])];
			const target = nextItems[index];
			if (!target) return current;
			nextItems[index] = {
				...target,
				[field]: field === "details" ? [value] : value,
			};
			return {
				...current,
				content: { ...current.content, [section]: nextItems },
			};
		});
	};

	const scrollToContentSection = (sectionId: string) => {
		const element = document.getElementById(sectionId);
		if (!element) return;
		setActiveContentSection(sectionId);
		element.scrollIntoView({ behavior: "smooth", block: "center" });
	};

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
							<FileText className="mr-1 size-3.5" />
							Resume Builder
						</Badge>
						<CardTitle className="text-xl sm:text-2xl">Resume Builder</CardTitle>
						<CardDescription>
							ATS-first layout, dynamic sections, and server-rendered PDF export.
						</CardDescription>
					</div>
					<CardAction className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="h-9 w-full px-3 sm:w-auto"
							onClick={() => setPreviewOpen(true)}
						>
							<Eye className="size-4" />
							Quick Preview
						</Button>
						<Button
							type="button"
							size="sm"
							className="h-9 w-full px-3 sm:w-auto"
							onClick={() => saveMutation.mutate()}
							disabled={saveMutation.isPending}
						>
							<Save className="size-4" />
							{saveMutation.isPending ? "Saving..." : "Save Resume"}
						</Button>
						<a href={pdfDownloadHref} className="w-full sm:w-auto">
							<Button
								type="button"
								size="sm"
								variant="secondary"
								className="h-9 w-full px-3 sm:w-auto"
							>
								<Download className="size-4" />
								Download PDF
							</Button>
						</a>
					</CardAction>
				</CardHeader>
				<CardContent className="space-y-4 text-sm">
					<div className="grid gap-4 lg:grid-cols-[1fr_320px]">
						<div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2">
							<div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Validation
							</div>
							<div className="flex flex-wrap gap-2">
								<Badge variant={liveValidation?.errors.length ? "destructive" : "secondary"}>
									Errors: {liveValidation?.errors.length ?? 0}
								</Badge>
								<Badge variant="outline">
									Warnings: {liveValidation?.warnings.length ?? 0}
								</Badge>
								<Badge variant="outline">
									Pages: {liveValidation?.estimatedPages ?? 1}
								</Badge>
							</div>
						</div>
						<div className="space-y-2">
							<Label
								htmlFor="resume-template-key"
								className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
							>
								PDF Template
							</Label>
							<select
								id="resume-template-key"
								className="h-9 w-full rounded-lg border border-border/70 bg-background/80 px-3 text-sm"
								value={resume.templateKey}
								onChange={(event) =>
									setResume((current) =>
										current
											? {
													...current,
													templateKey:
														event.target.value === "harvard_classic_v1"
															? "harvard_classic_v1"
															: "ats_classic_v1",
											  }
											: current,
									)
								}
							>
								{resumeTemplateOptions.map((option) => (
									<option key={option.key} value={option.key}>
										{option.label}
									</option>
								))}
							</select>
						</div>
					</div>
				</CardContent>
			</Card>

			<Tabs value={activeTab} onValueChange={setActiveTab} className="gap-3">
				<TabsList className="!h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-muted/45 p-1">
					<TabsTrigger value="content" className="h-9 flex-none rounded-lg px-3">
						Content
					</TabsTrigger>
					<TabsTrigger value="layout" className="h-9 flex-none rounded-lg px-3">
						Layout
					</TabsTrigger>
					<TabsTrigger value="preview" className="h-9 flex-none rounded-lg px-3">
						Preview
					</TabsTrigger>
				</TabsList>

					<TabsContent value="content" className="space-y-4">
						<div ref={navShellRef} className="flex flex-col gap-4 md:flex-row md:items-start">
							<aside ref={navAsideRef} className="md:w-[220px] md:shrink-0">
								<div
									style={pinnedStyle}
								>
									<div className="rounded-lg border border-border/70 bg-muted/20 p-2 md:max-h-[calc(100vh-7.5rem)] md:overflow-y-auto">
									<div className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
										Content sections
									</div>
									<div className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
									{contentSectionNav.map((section) => (
										<Button
											key={section.id}
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => scrollToContentSection(section.id)}
											className={
												activeContentSection === section.id
													? "justify-start whitespace-nowrap bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/35 dark:text-emerald-300"
													: "justify-start whitespace-nowrap"
											}
										>
											{section.label}
										</Button>
										))}
									</div>
								</div>
								</div>
							</aside>

							<div className="min-w-0 flex-1 space-y-4 pb-24">
					<Card id="resume-content-header" className={contentSectionCardClassName}>
						<CardHeader>
							<CardTitle className="text-lg">Header</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-3 md:grid-cols-2">
							<div>
								<Label>Full name</Label>
								<Input
									value={resume.content.header.fullName}
									onChange={(event) => setHeaderField("fullName", event.target.value)}
								/>
							</div>
							<div>
								<Label>Headline</Label>
								<Input
									value={resume.content.header.headline}
									onChange={(event) => setHeaderField("headline", event.target.value)}
								/>
							</div>
							<div>
								<Label>Email</Label>
								<Input
									value={resume.content.header.email}
									onChange={(event) => setHeaderField("email", event.target.value)}
								/>
							</div>
							<div>
								<Label>Phone</Label>
								<Input
									value={resume.content.header.phone}
									onChange={(event) => setHeaderField("phone", event.target.value)}
								/>
							</div>
						</CardContent>
					</Card>

					<Card id="resume-content-summary" className={contentSectionCardClassName}>
						<CardHeader>
							<CardTitle className="text-lg">Summary</CardTitle>
						</CardHeader>
						<CardContent>
							<Textarea
								rows={4}
								value={resume.content.summary}
								onChange={(event) =>
									setResume((current) =>
										current
											? {
													...current,
													content: {
														...current.content,
														summary: event.target.value,
													},
											  }
											: current,
									)
								}
							/>
							{renderInlineWarnings(summaryWarnings)}
						</CardContent>
					</Card>

					<Card id="resume-content-skills" className={contentSectionCardClassName}>
						<CardHeader>
							<CardTitle className="text-lg">Skills (comma separated)</CardTitle>
						</CardHeader>
						<CardContent>
							<Textarea
								rows={3}
								value={resume.content.skills.join(", ")}
								onChange={(event) =>
									setResume((current) =>
										current
											? {
													...current,
													content: {
														...current.content,
														skills: event.target.value
															.split(",")
															.map((entry) => entry.trim())
															.filter(Boolean),
													},
											  }
											: current,
									)
								}
							/>
							{renderInlineWarnings(skillsWarnings)}
						</CardContent>
					</Card>

					<Card id="resume-content-experience" className={contentSectionCardClassName}>
						<CardHeader className="flex-row items-center justify-between">
							<CardTitle className="text-lg">Experience</CardTitle>
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									setResume((current) =>
										current
											? {
													...current,
													content: {
														...current.content,
														experience: [
															...current.content.experience,
															{
																id: makeId(),
																role: "",
																company: "",
																location: "",
																startDate: "",
																endDate: "",
																isCurrent: false,
																bullets: [""],
															},
														],
													},
											  }
											: current,
									)
								}
							>
								Add role
							</Button>
						</CardHeader>
						<CardContent className="space-y-4">
							{resume.content.experience.map((item, index) => (
								<div key={item.id} className={itemBlockClassName}>
									<div className="flex items-center justify-between">
										<div className="text-sm font-medium">Role {index + 1}</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() =>
												setResume((current) =>
													current
														? {
																...current,
																content: {
																	...current.content,
																	experience: current.content.experience.filter(
																		(_, entryIndex) => entryIndex !== index,
																	),
																},
														  }
														: current,
												)
											}
										>
											<Trash2 className="size-4" />
											Remove
										</Button>
									</div>
									<div className="grid gap-2 md:grid-cols-2">
										<Input
											placeholder="Role"
											value={item.role}
											onChange={(event) =>
												setResume((current) =>
													current
														? {
																...current,
																content: {
																	...current.content,
																	experience: current.content.experience.map((entry, entryIndex) =>
																		entryIndex === index
																			? { ...entry, role: event.target.value }
																			: entry,
																	),
																},
														  }
														: current,
												)
											}
										/>
										<Input
											placeholder="Company"
											value={item.company}
											onChange={(event) =>
												setResume((current) =>
													current
														? {
																...current,
																content: {
																	...current.content,
																	experience: current.content.experience.map((entry, entryIndex) =>
																		entryIndex === index
																			? { ...entry, company: event.target.value }
																			: entry,
																	),
																},
														  }
														: current,
												)
											}
										/>
										<Input
											placeholder="Start date"
											value={item.startDate}
											onChange={(event) =>
												setResume((current) =>
													current
														? {
																...current,
																content: {
																	...current.content,
																	experience: current.content.experience.map((entry, entryIndex) =>
																		entryIndex === index
																			? { ...entry, startDate: event.target.value }
																			: entry,
																	),
																},
														  }
														: current,
												)
											}
										/>
										<Input
											placeholder="End date"
											value={item.endDate}
											onChange={(event) =>
												setResume((current) =>
													current
														? {
																...current,
																content: {
																	...current.content,
																	experience: current.content.experience.map((entry, entryIndex) =>
																		entryIndex === index
																			? { ...entry, endDate: event.target.value, isCurrent: false }
																			: entry,
																	),
																},
														  }
														: current,
												)
											}
										/>
									</div>
									<Textarea
										rows={4}
										placeholder="One bullet per line"
										value={item.bullets.join("\n")}
										onChange={(event) =>
											setResume((current) =>
												current
													? {
															...current,
															content: {
																...current.content,
																experience: current.content.experience.map((entry, entryIndex) =>
																	entryIndex === index
																		? {
																				...entry,
																				bullets: event.target.value
																					.split("\n")
																					.map((line) => line.trim())
																					.filter(Boolean),
																		  }
																		: entry,
																),
															},
													  }
													: current,
											)
										}
									/>
									{renderInlineWarnings(getExperienceWarnings(item.bullets))}
								</div>
							))}
						</CardContent>
					</Card>

					<Card id="resume-content-education" className={contentSectionCardClassName}>
						<CardHeader className="flex-row items-center justify-between">
							<CardTitle className="text-lg">Education</CardTitle>
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									setResume((current) =>
										current
											? {
													...current,
													content: {
														...current.content,
														education: [
															...current.content.education,
															{
																id: makeId(),
																school: "",
																degree: "",
																location: "",
																graduationDate: "",
																details: [],
															},
														],
													},
											  }
											: current,
									)
								}
							>
								Add education
							</Button>
						</CardHeader>
						<CardContent className="space-y-3">
							{resume.content.education.map((item, index) => (
								<div key={item.id} className={itemBlockClassName}>
									<div className="flex items-center justify-between">
										<div className="text-sm font-medium">Education {index + 1}</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() =>
												setResume((current) =>
													current
														? {
																...current,
																content: {
																	...current.content,
																	education: current.content.education.filter(
																		(_, entryIndex) => entryIndex !== index,
																	),
																},
														  }
														: current,
												)
											}
										>
											<Trash2 className="size-4" />
											Remove
										</Button>
									</div>
									<Input
										placeholder="Degree"
										value={item.degree}
										onChange={(event) =>
											setResume((current) =>
												current
													? {
															...current,
															content: {
																...current.content,
																education: current.content.education.map((entry, entryIndex) =>
																	entryIndex === index
																		? { ...entry, degree: event.target.value }
																		: entry,
																),
															},
													  }
													: current,
											)
										}
									/>
									<Input
										placeholder="School"
										value={item.school}
										onChange={(event) =>
											setResume((current) =>
												current
													? {
															...current,
															content: {
																...current.content,
																education: current.content.education.map((entry, entryIndex) =>
																	entryIndex === index
																		? { ...entry, school: event.target.value }
																		: entry,
																),
															},
													  }
													: current,
											)
										}
									/>
								</div>
							))}
						</CardContent>
					</Card>

					<Card id="resume-content-projects" className={contentSectionCardClassName}>
						<CardHeader className="flex-row items-center justify-between">
							<CardTitle className="text-lg">Projects</CardTitle>
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									setResume((current) =>
										current
											? {
													...current,
													content: {
														...current.content,
														projects: [
															...current.content.projects,
															{
																id: makeId(),
																name: "",
																description: "",
																url: "",
																highlights: [],
															},
														],
													},
											  }
											: current,
									)
								}
							>
								Add project
							</Button>
						</CardHeader>
						<CardContent className="space-y-3">
							{resume.content.projects.map((item, index) => (
								<div key={item.id} className={itemBlockClassName}>
									<div className="flex items-center justify-between">
										<div className="text-sm font-medium">Project {index + 1}</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() =>
												setResume((current) =>
													current
														? {
																...current,
																content: {
																	...current.content,
																	projects: current.content.projects.filter(
																		(_, entryIndex) => entryIndex !== index,
																	),
																},
														  }
														: current,
												)
											}
										>
											<Trash2 className="size-4" />
											Remove
										</Button>
									</div>
									<Input
										placeholder="Project name"
										value={item.name}
										onChange={(event) =>
											setResume((current) =>
												current
													? {
															...current,
															content: {
																...current.content,
																projects: current.content.projects.map((entry, entryIndex) =>
																	entryIndex === index
																		? { ...entry, name: event.target.value }
																		: entry,
																),
															},
													  }
													: current,
											)
										}
									/>
									<Textarea
										rows={3}
										placeholder="Description"
										value={item.description}
										onChange={(event) =>
											setResume((current) =>
												current
													? {
															...current,
															content: {
																...current.content,
																projects: current.content.projects.map((entry, entryIndex) =>
																	entryIndex === index
																		? { ...entry, description: event.target.value }
																		: entry,
																),
															},
													  }
													: current,
											)
										}
									/>
								</div>
							))}
						</CardContent>
					</Card>

					<Card id="resume-content-languages" className={contentSectionCardClassName}>
						<CardHeader>
							<CardTitle className="text-lg">Languages (comma separated)</CardTitle>
						</CardHeader>
						<CardContent>
							<Input
								value={resume.content.languages.join(", ")}
								onChange={(event) =>
									setResume((current) =>
										current
											? {
													...current,
													content: {
														...current.content,
														languages: event.target.value
															.split(",")
															.map((entry) => entry.trim())
															.filter(Boolean),
													},
											  }
											: current,
									)
								}
							/>
						</CardContent>
					</Card>

					{listSections.map((section) => (
						<Card
							key={section.key}
							id={`resume-content-${section.key}`}
							className={contentSectionCardClassName}
						>
							<CardHeader className="flex-row items-center justify-between">
								<CardTitle className="text-lg">{section.title}</CardTitle>
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										setResume((current) =>
											current
												? {
														...current,
														content: {
															...current.content,
															[section.key]: [
																...(current.content[section.key] as ResumeStructuredListItem[]),
																createResumeListItem(),
															],
														},
												  }
												: current,
										)
									}
								>
									Add item
								</Button>
							</CardHeader>
							<CardContent className="space-y-3">
								{(resume.content[section.key] as ResumeStructuredListItem[]).map((item, index) => (
									<div key={item.id} className={itemBlockClassName}>
										<div className="flex items-center justify-between">
											<div className="text-sm font-medium">Item {index + 1}</div>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() =>
													setResume((current) =>
														current
															? {
																	...current,
																	content: {
																		...current.content,
																		[section.key]: (
																			current.content[section.key] as ResumeStructuredListItem[]
																		).filter((_, entryIndex) => entryIndex !== index),
																	},
															  }
															: current,
													)
												}
											>
												<Trash2 className="size-4" />
												Remove
											</Button>
										</div>
										<Input
											placeholder="Title"
											value={item.title}
											onChange={(event) =>
												updateListSection(section.key, index, "title", event.target.value)
											}
										/>
										<Input
											placeholder="Subtitle"
											value={item.subtitle}
											onChange={(event) =>
												updateListSection(section.key, index, "subtitle", event.target.value)
											}
										/>
										<Textarea
											rows={2}
											placeholder="Details"
											value={item.details[0] ?? ""}
											onChange={(event) =>
												updateListSection(section.key, index, "details", event.target.value)
											}
										/>
										{section.key === "custom"
											? renderInlineWarnings(getCustomWarnings(item.details))
											: null}
									</div>
								))}
							</CardContent>
						</Card>
					))}
						<div className="h-20" aria-hidden="true" />
						</div>
					</div>
				</TabsContent>

				<TabsContent value="layout" className="space-y-4">
					<Card className={editorCardClassName}>
						<CardHeader>
							<CardTitle className="text-lg">Sections</CardTitle>
							<CardDescription>
								Toggle section visibility and reorder sections.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{resume.layout.sectionOrder.map((sectionKey, index) => {
								const section = resumeSections.find((entry) => entry.key === sectionKey);
								if (!section) return null;
								const visible =
									section.key === "header"
										? true
										: Boolean(resume.layout.visibility[section.key]);
								return (
									<div
										key={section.key}
										className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-3"
									>
										<div className="flex items-center gap-2">
											<Checkbox
												checked={visible}
												disabled={section.key === "header"}
												onCheckedChange={(checked) =>
													setResume((current) =>
														current
															? {
																...current,
																layout: {
																	...current.layout,
																	visibility: {
																		...current.layout.visibility,
																		[section.key]: Boolean(checked),
																	},
																},
														  }
															: current,
													)
												}
											/>
											<div>
												<div>{section.title}</div>
												<div className="text-xs text-muted-foreground">{section.kind}</div>
											</div>
										</div>
										<div className="flex gap-1">
											<Button
												type="button"
												variant="ghost"
												size="icon"
												disabled={section.key === "header" || index === 0}
												onClick={() =>
													setResume((current) =>
														current
															? {
																...current,
																layout: {
																	...current.layout,
																	sectionOrder: moveSection(
																		current.layout.sectionOrder,
																		section.key,
																		"up",
																	),
																},
														  }
															: current,
													)
												}
											>
												<ArrowUp className="size-4" />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												disabled={
													section.key === "header" ||
													index === resume.layout.sectionOrder.length - 1
												}
												onClick={() =>
													setResume((current) =>
														current
															? {
																...current,
																layout: {
																	...current.layout,
																	sectionOrder: moveSection(
																		current.layout.sectionOrder,
																		section.key,
																		"down",
																	),
																},
														  }
															: current,
													)
												}
											>
												<ArrowDown className="size-4" />
											</Button>
										</div>
									</div>
								);
							})}
							<Button
								type="button"
								variant="secondary"
								onClick={() => setResetLayoutDialogOpen(true)}
							>
								<Shuffle className="size-4" />
								Reset to default layout
							</Button>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="preview" className="space-y-4">
					<Card className={editorCardClassName}>
						<CardHeader>
							<CardTitle className="text-lg">Validation summary</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
								Warnings are advisory only. You can still create/save your resume.
								Only hard errors block PDF export.
							</div>
							<div className="text-sm font-medium">Errors</div>
							{liveValidation?.errors.length ? (
								<ul className="list-disc pl-5 text-sm text-rose-600 space-y-1">
									{liveValidation.errors.map((error) => (
										<li key={error.code + error.message}>{error.message}</li>
									))}
								</ul>
							) : (
								<div className="text-sm text-emerald-600">No hard errors.</div>
							)}
							<div className="pt-2 text-sm font-medium">Warnings</div>
							{liveValidation?.warnings.length ? (
								<ul className="list-disc pl-5 text-sm text-amber-600 space-y-1">
									{liveValidation.warnings.map((warning) => (
										<li key={warning.code + warning.message}>{warning.message}</li>
									))}
								</ul>
							) : (
								<div className="text-sm text-emerald-600">No warnings.</div>
							)}
						</CardContent>
					</Card>

					<Card className={editorCardClassName}>
						<CardHeader>
							<CardTitle className="text-lg">PDF Preview (Actual Render)</CardTitle>
							<CardDescription>
								This is the real server-generated PDF output.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							<div className="rounded-md border overflow-hidden">
								<iframe
									title="Resume PDF Preview"
									src={pdfInlineHref}
									className="h-[70dvh] min-h-[440px] w-full bg-white sm:h-[820px]"
								/>
							</div>
							<a
								href={`${apiBaseUrl}/resumes/me/pdf`}
								target="_blank"
								rel="noreferrer noopener"
								className="text-xs underline underline-offset-2"
							>
								Open PDF in new tab
							</a>
							<div className="font-semibold text-lg">{resume.content.header.fullName}</div>
							<div className="text-muted-foreground">{resume.content.header.headline}</div>
							<div>
								<div className="font-semibold">Section order</div>
								<div className="text-muted-foreground">
									{visibleSectionOrder
										.map((entry) => sectionTitleByKey[entry])
										.join(" → ")}
								</div>
							</div>

							{visibleSectionOrder.includes("summary") && resume.content.summary ? (
								<div className="space-y-1">
									<div className="font-semibold">Summary</div>
									<div>{resume.content.summary}</div>
								</div>
							) : null}

							{visibleSectionOrder.includes("experience") &&
							resume.content.experience.length ? (
								<div className="space-y-2">
									<div className="font-semibold">Experience</div>
									{resume.content.experience.map((item) => (
										<div key={item.id} className="rounded-md border p-2">
											<div className="font-medium">
												{[item.role, item.company].filter(Boolean).join(" · ")}
											</div>
											<div className="text-xs text-muted-foreground">
												{[item.startDate, item.endDate].filter(Boolean).join(" — ")}
											</div>
											{item.bullets.length ? (
												<ul className="list-disc pl-4 mt-1 space-y-1">
													{item.bullets.map((bullet, index) => (
														<li key={`${item.id}-bullet-${index}`}>{bullet}</li>
													))}
												</ul>
											) : null}
										</div>
									))}
								</div>
							) : null}

							{visibleSectionOrder.includes("education") &&
							resume.content.education.length ? (
								<div className="space-y-2">
									<div className="font-semibold">Education</div>
									{resume.content.education.map((item) => (
										<div key={item.id} className="rounded-md border p-2">
											<div className="font-medium">
												{[item.degree, item.school].filter(Boolean).join(" · ")}
											</div>
										</div>
									))}
								</div>
							) : null}

							{visibleSectionOrder.includes("skills") &&
							resume.content.skills.length ? (
								<div className="space-y-1">
									<div className="font-semibold">Skills</div>
									<div>{resume.content.skills.join(", ")}</div>
								</div>
							) : null}

							{visibleSectionOrder.includes("projects") &&
							resume.content.projects.length ? (
								<div className="space-y-2">
									<div className="font-semibold">Projects</div>
									{resume.content.projects.map((item) => (
										<div key={item.id} className="rounded-md border p-2">
											<div className="font-medium">{item.name}</div>
											{item.description ? <div>{item.description}</div> : null}
										</div>
									))}
								</div>
							) : null}

							{visibleSectionOrder.includes("languages") &&
							resume.content.languages.length ? (
								<div className="space-y-1">
									<div className="font-semibold">Languages</div>
									<div>{resume.content.languages.join(", ")}</div>
								</div>
							) : null}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{previewOpen ? (
				<div className="fixed inset-0 z-50 bg-black/60 p-2 sm:p-6">
					<div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl sm:rounded-xl">
						<div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
							<div>
								<div className="text-sm font-semibold">Quick preview</div>
								<div className="text-xs text-muted-foreground">
									Live PDF output with current unsaved editor state.
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
							<div className="overflow-hidden rounded-md border">
								<iframe
									title="Resume PDF Preview Modal"
									src={pdfInlineHref}
									className="h-[78dvh] min-h-[500px] w-full bg-white sm:h-[860px]"
								/>
							</div>
						</div>
					</div>
				</div>
			) : null}

			{shortcutsOpen ? (
				<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-4 sm:items-center sm:py-6">
					<Card className="flex max-h-[85vh] w-full max-w-md flex-col border-border/70 shadow-xl">
						<CardHeader>
							<CardTitle className="text-lg">Keyboard shortcuts</CardTitle>
							<CardDescription>Productivity shortcuts for Resume Builder.</CardDescription>
						</CardHeader>
						<CardContent className="min-h-0 space-y-2 overflow-y-auto text-sm">
							<div className="flex items-center justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-2">
								<span>Save resume</span>
								<code className="text-xs">Ctrl/Cmd + S</code>
							</div>
							<div className="flex items-center justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-2">
								<span>Open quick preview</span>
								<code className="text-xs">Ctrl/Cmd + Shift + P</code>
							</div>
							<div className="flex items-center justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-2">
								<span>Close popups</span>
								<code className="text-xs">Esc</code>
							</div>
							<div className="flex justify-end pt-2">
								<Button type="button" variant="outline" onClick={() => setShortcutsOpen(false)}>
									Close
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			) : null}

			{resetLayoutDialogOpen ? (
				<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-4 sm:items-center sm:py-6">
					<Card className="flex max-h-[85vh] w-full max-w-md flex-col border-border/70 shadow-xl">
						<CardHeader>
							<CardTitle className="text-lg">Reset section layout?</CardTitle>
							<CardDescription>
								This restores default section order and visibility preferences.
							</CardDescription>
						</CardHeader>
						<CardContent className="min-h-0 overflow-y-auto">
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setResetLayoutDialogOpen(false)}
								>
									Cancel
								</Button>
								<Button
									type="button"
									variant="destructive"
									onClick={() => {
										setResume((current) => (current ? resetResumeLayout(current) : current));
										setResetLayoutDialogOpen(false);
									}}
								>
									Reset
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			) : null}
		</main>
	);
}
