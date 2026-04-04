import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiBaseUrl } from "@/lib/axios.client";
import { sessionQueryKey, useSession } from "@/hooks/useSession";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Download, Save, Shuffle, Trash2, WandSparkles } from "lucide-react";

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

export default function ResumeBuilderPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const sessionQuery = useSession();
	const [resume, setResume] = useState<ResumeRecord | null>(null);
	const [serverValidation, setServerValidation] = useState<ResumeValidationResult | null>(null);
	const [status, setStatus] = useState("");

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
		setServerValidation(resumeQuery.data.validation);
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

	const saveMutation = useMutation({
		mutationFn: async () => {
			const { data } = await api.put<{ resume: ResumeRecord; validation: ResumeValidationResult }>(
				"/resumes/me",
				{ resume },
			);
			return data;
		},
		onSuccess: async (data) => {
			setStatus("Resume saved.");
			setResume(cloneResume(data.resume));
			setServerValidation(data.validation);
			await queryClient.invalidateQueries({ queryKey: ["my-resume"] });
		},
	});

	const syncMutation = useMutation({
		mutationFn: async () => api.post("/resumes/me/sync-portfolio"),
		onSuccess: async () => {
			setStatus("Resume synced to portfolio.");
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio"] });
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
		},
	});

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

	return (
		<main className="space-y-4">
			<Card className="border-border/70 shadow-none">
				<CardHeader className="space-y-3 md:flex-row md:items-center md:justify-between">
					<div>
						<CardTitle className="text-2xl">Resume Builder</CardTitle>
						<CardDescription>
							ATS-first layout, dynamic sections, and PDF export.
						</CardDescription>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => syncMutation.mutate()}
							disabled={syncMutation.isPending}
						>
							<WandSparkles className="size-4" />
							{syncMutation.isPending ? "Syncing..." : "Sync to Portfolio"}
						</Button>
						<Button
							type="button"
							onClick={() => saveMutation.mutate()}
							disabled={saveMutation.isPending}
						>
							<Save className="size-4" />
							{saveMutation.isPending ? "Saving..." : "Save Resume"}
						</Button>
						<a href={pdfDownloadHref}>
							<Button type="button" variant="secondary">
								<Download className="size-4" />
								Download PDF
							</Button>
						</a>
					</div>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<div className="flex flex-wrap items-center gap-2">
						<Label htmlFor="resume-template-key" className="text-xs text-muted-foreground">
							PDF template
						</Label>
						<select
							id="resume-template-key"
							className="h-9 rounded-md border border-input bg-background px-3 text-sm"
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
					<div className="flex flex-wrap gap-2">
						<Badge variant={liveValidation?.errors.length ? "destructive" : "secondary"}>
							Hard errors: {liveValidation?.errors.length ?? 0}
						</Badge>
						<Badge variant="outline">
							Warnings: {liveValidation?.warnings.length ?? 0}
						</Badge>
						<Badge variant="outline">
							Estimated pages: {liveValidation?.estimatedPages ?? 1}
						</Badge>
					</div>
					{status ? <div className="text-sm text-emerald-600">{status}</div> : null}
					{serverValidation?.errors.length ? (
						<div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
							Server validation found hard errors. Fix them before PDF export.
						</div>
					) : null}
				</CardContent>
			</Card>

			<Tabs defaultValue="content" className="space-y-4">
				<TabsList>
					<TabsTrigger value="content">Content</TabsTrigger>
					<TabsTrigger value="layout">Layout</TabsTrigger>
					<TabsTrigger value="preview">Preview</TabsTrigger>
				</TabsList>

				<TabsContent value="content" className="space-y-4">
					<Card>
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

					<Card>
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

					<Card>
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

					<Card>
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
								<div key={item.id} className="rounded-lg border p-3 space-y-2">
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

					<Card>
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
								<div key={item.id} className="rounded-lg border p-3 space-y-2">
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

					<Card>
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
								<div key={item.id} className="rounded-lg border p-3 space-y-2">
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

					<Card>
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
						<Card key={section.key}>
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
									<div key={item.id} className="rounded-lg border p-3 space-y-2">
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
				</TabsContent>

				<TabsContent value="layout" className="space-y-4">
					<Card>
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
										className="flex items-center justify-between rounded-lg border p-3"
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
								onClick={() => setResume((current) => (current ? resetResumeLayout(current) : current))}
							>
								<Shuffle className="size-4" />
								Reset to default layout
							</Button>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="preview" className="space-y-4">
					<Card>
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

					<Card>
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
									className="h-[820px] w-full bg-white"
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
		</main>
	);
}
