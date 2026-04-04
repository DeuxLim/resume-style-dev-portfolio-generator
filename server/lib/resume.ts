import PDFDocument from "pdfkit";
import { randomUUID } from "node:crypto";
import { buildStarterResume, defaultResumeLayout } from "../../shared/defaults/resume.js";
import { defaultPortfolioLayout } from "../../shared/defaults/portfolio.js";
import {
	normalizeResumeContent,
	normalizeResumeLayout,
	validateResume,
} from "../../shared/lib/resume.js";
import type {
	CustomSection,
	EditablePortfolio,
	ExperienceItem,
	PortfolioRecord,
	ProjectItem,
	TechCategory,
	TimelineItem,
} from "../../shared/types/portfolio.types.js";
import type {
	ResumeContent,
	ResumeLayout,
	ResumeRecord,
	ResumeSectionKey,
	ResumeStructuredListItem,
	ResumeTemplateKey,
	ResumeValidationResult,
} from "../../shared/types/resume.types.js";

type ResumeRow = {
	template_key: string;
	content_json: string | null;
	layout_json: string | null;
	created_at?: Date;
	updated_at?: Date;
};

const parseJson = <T>(value: unknown, fallback: T): T => {
	if (value === null || value === undefined) {
		return fallback;
	}

	if (typeof value === "string") {
		try {
			return JSON.parse(value) as T;
		} catch {
			return fallback;
		}
	}

	if (Buffer.isBuffer(value)) {
		try {
			return JSON.parse(value.toString("utf8")) as T;
		} catch {
			return fallback;
		}
	}

	if (typeof value === "object") {
		return value as T;
	}

	return fallback;
};

const makeId = () => randomUUID();
const isResumeTemplateKey = (value: unknown): value is ResumeTemplateKey =>
	value === "ats_classic_v1" || value === "harvard_classic_v1";

export const mapResumeRow = (
	row: ResumeRow,
	fallback: ResumeRecord,
): ResumeRecord => {
	const contentInput = parseJson<ResumeContent>(row.content_json, fallback.content);
	const layoutInput = parseJson<ResumeLayout>(row.layout_json, fallback.layout);

	const resume: ResumeRecord = {
		templateKey: isResumeTemplateKey(row.template_key)
			? row.template_key
			: fallback.templateKey,
		content: normalizeResumeContent(contentInput),
		layout: normalizeResumeLayout(layoutInput),
	};

	if (row.created_at) {
		resume.createdAt = row.created_at.toISOString();
	}
	if (row.updated_at) {
		resume.updatedAt = row.updated_at.toISOString();
	}

	return resume;
};

export const serializeResume = (resume: ResumeRecord) => {
	const content = normalizeResumeContent(resume.content);
	const layout = normalizeResumeLayout(resume.layout);

	return {
		templateKey: isResumeTemplateKey(resume.templateKey)
			? resume.templateKey
			: "ats_classic_v1",
		contentJson: JSON.stringify(content),
		layoutJson: JSON.stringify(layout),
	};
};

const truncate = (value: string, max: number) =>
	value.length > max ? `${value.slice(0, max - 1)}…` : value;

const toTechCategories = (skills: string[]): TechCategory[] => {
	const chunks: string[][] = [];
	for (let index = 0; index < skills.length; index += 8) {
		chunks.push(skills.slice(index, index + 8));
	}
	return chunks.map((items, index) => ({
		id: makeId(),
		name: index === 0 ? "Core Skills" : `Skills ${index + 1}`,
		items,
	}));
};

const toCustomSectionFromList = (
	title: string,
	type: "text" | "bullets" | "links",
	items: ResumeStructuredListItem[],
): CustomSection | null => {
	if (!items.length) return null;
	if (type === "bullets") {
		return {
			id: makeId(),
			title,
			type: "bullets",
			body: "",
			items: items.map((item) =>
				[item.title, item.subtitle, item.date].filter(Boolean).join(" · "),
			),
			links: [],
		};
	}
	if (type === "links") {
		return {
			id: makeId(),
			title,
			type: "links",
			body: "",
			items: [],
			links: items
				.filter((item) => item.url || item.title)
				.map((item) => ({
					id: item.id || makeId(),
					label: item.title || item.url,
					url: item.url || "",
				})),
		};
	}
	return {
		id: makeId(),
		title,
		type: "text",
		body: items
			.map((item) =>
				[item.title, item.subtitle, item.location, item.date]
					.filter(Boolean)
					.join(" · "),
			)
			.filter(Boolean)
			.join("\n"),
		items: [],
		links: [],
	};
};

const buildTimeline = (experience: ResumeContent["experience"]): TimelineItem[] =>
	experience.slice(0, 8).map((item) => ({
		id: item.id || makeId(),
		year: item.endDate || (item.isCurrent ? "Present" : item.startDate),
		position: item.role,
		company: item.company,
		note: item.location,
	}));

const buildExperiences = (experience: ResumeContent["experience"]): ExperienceItem[] =>
	experience.map((item) => ({
		id: item.id || makeId(),
		role: item.role,
		company: item.company,
		period: [item.startDate, item.isCurrent ? "Present" : item.endDate]
			.filter(Boolean)
			.join(" — "),
		highlights: item.bullets,
	}));

const buildProjects = (projects: ResumeContent["projects"]): ProjectItem[] =>
	projects.map((item) => ({
		id: item.id || makeId(),
		name: item.name,
		description: item.description,
		url: item.url,
	}));

const isSectionVisible = (
	layout: ResumeLayout,
	section: ResumeSectionKey,
) => (section === "header" ? true : Boolean(layout.visibility[section]));

export const mapResumeToPortfolio = (
	resume: ResumeRecord,
	portfolio: EditablePortfolio,
): EditablePortfolio => {
	const content = normalizeResumeContent(resume.content);
	const layout = normalizeResumeLayout(resume.layout);

	const summary = content.summary.trim();
	const customSections: CustomSection[] = [];
	const addIfExists = (section: CustomSection | null) => {
		if (section) customSections.push(section);
	};

	if (isSectionVisible(layout, "certifications")) {
		addIfExists(
			toCustomSectionFromList("Certifications", "bullets", content.certifications),
		);
	}
	if (isSectionVisible(layout, "awards")) {
		addIfExists(toCustomSectionFromList("Awards", "bullets", content.awards));
	}
	if (isSectionVisible(layout, "volunteer")) {
		addIfExists(
			toCustomSectionFromList("Volunteer", "bullets", content.volunteer),
		);
	}
	if (isSectionVisible(layout, "publications")) {
		addIfExists(
			toCustomSectionFromList("Publications", "links", content.publications),
		);
	}
	if (isSectionVisible(layout, "custom")) {
		addIfExists(toCustomSectionFromList("Custom", "text", content.custom));
	}
	if (isSectionVisible(layout, "languages") && content.languages.length) {
		customSections.push({
			id: makeId(),
			title: "Languages",
			type: "bullets",
			body: "",
			items: content.languages,
			links: [],
		});
	}

	const educationLine = content.education
		.map((item) => [item.degree, item.school].filter(Boolean).join(" · "))
		.filter(Boolean)[0];

	return {
		...portfolio,
		fullName: content.header.fullName || portfolio.fullName,
		headline: content.header.headline || portfolio.headline,
		location: content.header.location || portfolio.location,
		email: content.header.email || portfolio.email,
		phone: content.header.phone,
		githubUrl: content.header.githubUrl,
		linkedinUrl: content.header.linkedinUrl,
		about: summary
			? [summary, ...portfolio.about.slice(1)]
			: portfolio.about,
		experienceSummary: truncate(summary || portfolio.experienceSummary, 160),
		education: educationLine || portfolio.education,
		timeline: buildTimeline(content.experience),
		experiences: buildExperiences(content.experience),
		projects: buildProjects(content.projects),
		techCategories: toTechCategories(content.skills),
		customSections,
		layout: {
			...portfolio.layout,
			sectionOrder: [...defaultPortfolioLayout.sectionOrder],
			sectionSpans: { ...defaultPortfolioLayout.sectionSpans },
			sectionHeights: { ...defaultPortfolioLayout.sectionHeights },
		},
	};
};

const headerLine = (content: ResumeContent) =>
	[
		content.header.location,
		content.header.email,
		content.header.phone,
		content.header.websiteUrl,
		content.header.linkedinUrl,
		content.header.githubUrl,
	]
		.filter(Boolean)
		.join("  |  ");

export const renderResumePdf = (
	resume: ResumeRecord,
	validation: ResumeValidationResult,
) => {
	if (!validation.canExportPdf) {
		throw new Error("Resume cannot be exported while hard validation errors exist.");
	}

	const content = normalizeResumeContent(resume.content);
	const layout = normalizeResumeLayout(resume.layout);
	const templateKey = isResumeTemplateKey(resume.templateKey)
		? resume.templateKey
		: "ats_classic_v1";
	const style =
		templateKey === "harvard_classic_v1"
			? {
					headingFont: "Times-Bold",
					bodyFont: "Times-Roman",
					sectionHeadingSize: 10.8,
					sectionRuleColor: "#4b5563",
					sectionRuleWidth: 0.3,
					nameFont: "Times-Bold",
					nameSize: 25,
					nameAlign: "center" as const,
					headlineFont: "Times-Roman",
					headlineSize: 12,
					headlineAlign: "center" as const,
					metaFont: "Times-Roman",
					metaSize: 10.2,
					metaAlign: "center" as const,
					itemTitleFont: "Times-Bold",
					itemTitleSize: 12,
					bodySize: 10.8,
					bulletFont: "Times-Roman",
					bulletSize: 10.5,
					bulletIndent: 11,
					spacing: {
						headerNameToHeadline: 2,
						headerHeadlineToMeta: 3,
						headerToBody: 7,
						sectionTop: 8,
						sectionRuleOffset: 2,
						sectionToContent: 4,
						metaToBullets: 2,
						entryGap: 5,
					},
			  }
			: {
					headingFont: "Helvetica-Bold",
					bodyFont: "Helvetica",
					sectionHeadingSize: 10.5,
					sectionRuleColor: "#333",
					sectionRuleWidth: 0.4,
					nameFont: "Helvetica-Bold",
					nameSize: 18,
					nameAlign: "left" as const,
					headlineFont: "Helvetica",
					headlineSize: 11,
					headlineAlign: "left" as const,
					metaFont: "Helvetica",
					metaSize: 9.4,
					metaAlign: "left" as const,
					itemTitleFont: "Helvetica-Bold",
					itemTitleSize: 10.5,
					bodySize: 10,
					bulletFont: "Helvetica",
					bulletSize: 10,
					bulletIndent: 10,
					spacing: {
						headerNameToHeadline: 3,
						headerHeadlineToMeta: 4,
						headerToBody: 8,
						sectionTop: 9,
						sectionRuleOffset: 2,
						sectionToContent: 5,
						metaToBullets: 2,
						entryGap: 6,
					},
			  };

	const doc = new PDFDocument({
		size: "LETTER",
		margins: { top: 24, bottom: 24, left: 24, right: 24 },
		info: { Title: `${content.header.fullName || "Resume"} Resume` },
	});
	const pageWidth =
		doc.page.width - doc.page.margins.left - doc.page.margins.right;
	const spacing = style.spacing;

	const addSpace = (points: number) => {
		doc.y += points;
	};

	let renderedSectionCount = 0;
	const writeSectionTitle = (title: string) => {
		addSpace(renderedSectionCount === 0 ? 0 : spacing.sectionTop);
		doc.font(style.headingFont).fontSize(style.sectionHeadingSize).text(title.toUpperCase(), {
			continued: false,
			lineGap: 0.6,
		});
		const currentY = doc.y + spacing.sectionRuleOffset;
		doc
			.moveTo(doc.page.margins.left, currentY)
			.lineTo(doc.page.margins.left + pageWidth, currentY)
			.strokeColor(style.sectionRuleColor)
			.lineWidth(style.sectionRuleWidth)
			.stroke();
		addSpace(spacing.sectionToContent);
		doc.strokeColor("#000");
		renderedSectionCount += 1;
	};

	const writeMeta = (value: string) => {
		if (!value.trim()) return;
		doc.font(style.metaFont).fontSize(style.metaSize).text(value, {
			lineGap: 0.8,
		});
	};

	const writeBullets = (bullets: string[]) => {
		if (!bullets.length) return;
		for (const bullet of bullets) {
			doc.font(style.bulletFont).fontSize(style.bulletSize).text(`• ${bullet}`, {
				align: "left",
				lineGap: 1.15,
				indent: style.bulletIndent,
			});
		}
	};

	doc.font(style.nameFont).fontSize(style.nameSize).text(content.header.fullName || "Your Name", {
		align: style.nameAlign,
		lineGap: 1,
	});
	if (content.header.headline) {
		addSpace(spacing.headerNameToHeadline);
		doc.font(style.headlineFont).fontSize(style.headlineSize).text(content.header.headline, {
			align: style.headlineAlign,
			lineGap: 1,
		});
	}
	const line = headerLine(content);
	if (line) {
		addSpace(spacing.headerHeadlineToMeta);
		doc.font(style.metaFont).fontSize(style.metaSize).text(line, {
			align: style.metaAlign,
			lineGap: 0.95,
		});
	}
	addSpace(spacing.headerToBody);

	const orderedSections = layout.sectionOrder.filter((section) =>
		section === "header" ? false : Boolean(layout.visibility[section]),
	);

	for (const section of orderedSections) {
		if (section === "summary" && content.summary) {
			writeSectionTitle("Summary");
			doc.font(style.bodyFont).fontSize(style.bodySize).text(content.summary, {
				lineGap: 1.25,
			});
		}
		if (section === "experience" && content.experience.length) {
			writeSectionTitle("Experience");
			for (const item of content.experience) {
				doc.font(style.itemTitleFont)
					.fontSize(style.itemTitleSize)
					.text(`${item.role} · ${item.company}`, { lineGap: 1 });
				writeMeta(
					[item.location, `${item.startDate} - ${item.isCurrent ? "Present" : item.endDate}`]
						.filter(Boolean)
						.join(" | "),
				);
				addSpace(spacing.metaToBullets);
				writeBullets(item.bullets);
				addSpace(spacing.entryGap);
			}
		}
		if (section === "education" && content.education.length) {
			writeSectionTitle("Education");
			for (const item of content.education) {
				doc.font(style.itemTitleFont)
					.fontSize(style.itemTitleSize)
					.text([item.degree, item.school].filter(Boolean).join(" · "), {
						lineGap: 1,
					});
				writeMeta(
					[item.location, item.graduationDate].filter(Boolean).join(" | "),
				);
				addSpace(spacing.metaToBullets);
				writeBullets(item.details);
				addSpace(spacing.entryGap);
			}
		}
		if (section === "skills" && content.skills.length) {
			writeSectionTitle("Skills");
			doc.font(style.bodyFont).fontSize(style.bodySize).text(content.skills.join(", "), {
				lineGap: 1.25,
			});
		}
		if (section === "projects" && content.projects.length) {
			writeSectionTitle("Projects");
			for (const item of content.projects) {
				doc.font(style.itemTitleFont).fontSize(style.itemTitleSize).text(item.name, {
					lineGap: 1,
				});
				if (item.description) {
					doc.font(style.bodyFont).fontSize(style.bodySize).text(item.description, {
						lineGap: 1.25,
					});
				}
				if (item.url) {
					doc.fillColor("#1d4ed8").font(style.bodyFont).text(item.url, {
						lineGap: 1,
					});
					doc.fillColor("#000");
				}
				addSpace(spacing.metaToBullets);
				writeBullets(item.highlights);
				addSpace(spacing.entryGap);
			}
		}
		const listSections: Array<{
			key: ResumeSectionKey;
			title: string;
			items: ResumeStructuredListItem[];
		}> = [
			{ key: "certifications", title: "Certifications", items: content.certifications },
			{ key: "awards", title: "Awards", items: content.awards },
			{ key: "volunteer", title: "Volunteer", items: content.volunteer },
			{ key: "publications", title: "Publications", items: content.publications },
			{ key: "custom", title: "Custom", items: content.custom },
		];
		for (const listSection of listSections) {
			if (section !== listSection.key || !listSection.items.length) continue;
			writeSectionTitle(listSection.title);
			for (const item of listSection.items) {
				doc
					.font(style.itemTitleFont)
					.fontSize(style.itemTitleSize)
					.text([item.title, item.subtitle].filter(Boolean).join(" · "), {
						lineGap: 1,
					});
				writeMeta([item.location, item.date].filter(Boolean).join(" | "));
				addSpace(spacing.metaToBullets);
				writeBullets(item.details);
				if (item.url) {
					doc.fillColor("#1d4ed8").font(style.bodyFont).text(item.url, {
						lineGap: 1,
					});
					doc.fillColor("#000");
				}
				addSpace(spacing.entryGap);
			}
		}
		if (section === "languages" && content.languages.length) {
			writeSectionTitle("Languages");
			doc.font(style.bodyFont).fontSize(style.bodySize).text(content.languages.join(", "), {
				lineGap: 1.25,
			});
		}
	}

	return doc;
};

export const createStarterResumeFromPortfolio = (
	portfolio: PortfolioRecord,
): ResumeRecord => {
	const starter = buildStarterResume({
		fullName: portfolio.fullName,
		email: portfolio.email,
		location: portfolio.location,
		headline: portfolio.headline,
	});
	starter.content.summary = portfolio.about[0] ?? starter.content.summary;
	starter.content.skills = portfolio.techCategories.flatMap((category) => category.items);
	starter.content.experience = portfolio.experiences.map((experience) => ({
		id: experience.id || makeId(),
		role: experience.role,
		company: experience.company,
		location: "",
		startDate: experience.period.split("—")[0]?.trim() ?? experience.period,
		endDate: experience.period.split("—")[1]?.trim() ?? "",
		isCurrent: /present/i.test(experience.period),
		bullets: experience.highlights,
	}));
	starter.content.education = [
		{
			id: makeId(),
			school: portfolio.education,
			degree: portfolio.education,
			location: portfolio.location,
			graduationDate: "",
			details: [],
		},
	];
	starter.content.projects = portfolio.projects.map((project) => ({
		id: project.id || makeId(),
		name: project.name,
		description: project.description,
		url: project.url,
		highlights: [],
	}));
	starter.layout = {
		...defaultResumeLayout,
		sectionOrder: [...defaultResumeLayout.sectionOrder],
		visibility: { ...defaultResumeLayout.visibility },
		positions: {},
	};
	return starter;
};

export { validateResume };
