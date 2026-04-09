import PDFDocument from "pdfkit";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildStarterResume, defaultResumeLayout } from "../../shared/defaults/resume.js";
import { defaultPortfolioLayout } from "../../shared/defaults/portfolio.js";
import {
	groupResumeSkills,
	normalizeResumeContent,
	normalizeResumeLayout,
	validateResume,
} from "../../shared/lib/resume.js";
import type {
	CustomSection,
	EditablePortfolio,
	ExperienceItem,
	HeaderAction,
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modernFontFiles = {
	regular: path.resolve(__dirname, "../assets/fonts/HelveticaNeue-regular.ttf"),
	bold: path.resolve(__dirname, "../assets/fonts/HelveticaNeue-bold.ttf"),
	italic: path.resolve(__dirname, "../assets/fonts/HelveticaNeue-italic.ttf"),
	boldItalic: path.resolve(__dirname, "../assets/fonts/HelveticaNeue-boldItalic.ttf"),
};

const hasModernFontFiles = () =>
	fs.existsSync(modernFontFiles.regular) &&
	fs.existsSync(modernFontFiles.bold) &&
	fs.existsSync(modernFontFiles.italic) &&
	fs.existsSync(modernFontFiles.boldItalic);

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
	value === "ats_classic_v1" ||
	value === "harvard_classic_v1" ||
	value === "deux_modern_v1";

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

const createHeaderActionId = (prefix: string) =>
	`${prefix}-${Math.random().toString(16).slice(2, 10)}`;

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
			items: items
				.map((item) => {
					const heading = [item.title, item.subtitle, item.location, item.date]
						.filter(Boolean)
						.join(" · ");
					const detail = item.details.find((entry) => entry.trim())?.trim() ?? "";
					return [heading, detail].filter(Boolean).join(" — ");
				})
				.filter(Boolean),
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
				.filter((item) => item.url.trim())
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
			.map((item) => {
				const heading = [item.title, item.subtitle, item.location, item.date]
					.filter(Boolean)
					.join(" · ");
				const details = item.details.map((entry) => entry.trim()).filter(Boolean);
				return [heading, ...details].filter(Boolean).join("\n");
			})
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

const getGithubUsernameFromUrl = (value: string) => {
	const raw = value.trim();
	if (!raw) return "";
	const cleaned = raw
		.replace(/^https?:\/\//i, "")
		.replace(/^www\./i, "")
		.replace(/^github\.com\//i, "")
		.replace(/^\//, "")
		.replace(/\/+$/, "");
	if (!cleaned || cleaned.includes("/")) return "";
	return cleaned;
};

const mergeHeaderActions = (
	existing: HeaderAction[],
	contactValues: {
		githubUrl: string;
		linkedinUrl: string;
		email: string;
		phone: string;
	},
): HeaderAction[] => {
	const source = Array.isArray(existing) ? [...existing] : [];
	const configs: Array<{
		type: HeaderAction["type"];
		label: string;
		display: HeaderAction["display"];
		value: string;
	}> = [
		{ type: "github", label: "Github", display: "label", value: contactValues.githubUrl },
		{ type: "linkedin", label: "LinkedIn", display: "label", value: contactValues.linkedinUrl },
		{ type: "email", label: "Email", display: "value", value: contactValues.email },
		{ type: "phone", label: "Phone", display: "value", value: contactValues.phone },
	];

	for (const config of configs) {
		const existingIndex = source.findIndex((action) => action.type === config.type);
		if (existingIndex >= 0) {
			const existingAction = source[existingIndex];
			if (!existingAction) continue;
			source[existingIndex] = {
				...existingAction,
				value: config.value,
				label: existingAction.label || config.label,
				display: existingAction.display ?? config.display,
			};
			continue;
		}

		if (source.length >= 4) continue;

		source.push({
			id: createHeaderActionId(config.type),
			type: config.type,
			label: config.label,
			display: config.display,
			value: config.value,
		});
	}

	return source.slice(0, 4);
};

export const mapResumeToPortfolio = (
	resume: ResumeRecord,
	portfolio: EditablePortfolio,
): EditablePortfolio => {
	const content = normalizeResumeContent(resume.content);
	const layout = normalizeResumeLayout(resume.layout);
	const summaryVisible = isSectionVisible(layout, "summary");
	const experienceVisible = isSectionVisible(layout, "experience");
	const educationVisible = isSectionVisible(layout, "education");
	const skillsVisible = isSectionVisible(layout, "skills");
	const projectsVisible = isSectionVisible(layout, "projects");

	const summary = summaryVisible ? content.summary.trim() : "";
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
	const githubUrl = content.header.githubUrl || portfolio.githubUrl;
	const linkedinUrl = content.header.linkedinUrl || portfolio.linkedinUrl;
	const email = content.header.email || portfolio.email;
	const phone = content.header.phone || portfolio.phone;
	const mergedHeaderActions = mergeHeaderActions(portfolio.headerActions, {
		githubUrl,
		linkedinUrl,
		email,
		phone,
	});

	return {
		...portfolio,
		fullName: content.header.fullName || portfolio.fullName,
		headline: content.header.headline || portfolio.headline,
		location: content.header.location || portfolio.location,
		email,
		phone,
		githubUrl,
		githubUsername: getGithubUsernameFromUrl(githubUrl) || portfolio.githubUsername,
		linkedinUrl,
		headerActions: mergedHeaderActions,
		about: summary
			? [summary, ...portfolio.about.slice(1)]
			: portfolio.about,
		experienceSummary: truncate(summary || portfolio.experienceSummary, 160),
		education: educationVisible ? educationLine || portfolio.education : portfolio.education,
		timeline: experienceVisible ? buildTimeline(content.experience) : portfolio.timeline,
		experiences: experienceVisible ? buildExperiences(content.experience) : portfolio.experiences,
		projects: projectsVisible ? buildProjects(content.projects) : portfolio.projects,
		techCategories: skillsVisible ? toTechCategories(content.skills) : portfolio.techCategories,
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

const formatHeaderLinkText = (value: string) =>
	value
		.replace(/^https?:\/\//i, "")
		.replace(/\/+$/g, "");

const parseHeaderPhotoDataUrl = (value: string): Buffer | null => {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const match = trimmed.match(/^data:image\/(?:png|jpe?g);base64,([\s\S]+)$/i);
	if (!match) return null;
	try {
		return Buffer.from(match[1], "base64");
	} catch {
		return null;
	}
};

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
	const useEmbeddedModernFonts =
		templateKey === "deux_modern_v1" && hasModernFontFiles();
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
					linkColor: "#1d4ed8",
					defaultTextColor: "#000000",
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
			: templateKey === "deux_modern_v1"
				? {
						headingFont: useEmbeddedModernFonts ? "Modern-Bold" : "Helvetica-Bold",
						bodyFont: useEmbeddedModernFonts ? "Modern-Regular" : "Helvetica",
						bodyItalicFont: useEmbeddedModernFonts
							? "Modern-Italic"
							: "Helvetica-Oblique",
						itemTitleItalicFont: useEmbeddedModernFonts
							? "Modern-BoldItalic"
							: "Helvetica-BoldOblique",
						sectionHeadingSize: 11,
						sectionRuleColor: "#000000",
						sectionRuleWidth: 0.5,
						nameFont: useEmbeddedModernFonts ? "Modern-Bold" : "Helvetica-Bold",
						nameSize: 17,
						nameAlign: "left" as const,
						headlineFont: useEmbeddedModernFonts ? "Modern-Regular" : "Helvetica",
						headlineSize: 10,
						headlineAlign: "left" as const,
						metaFont: useEmbeddedModernFonts ? "Modern-Regular" : "Helvetica",
						metaSize: 10,
						metaAlign: "left" as const,
						itemTitleFont: useEmbeddedModernFonts ? "Modern-Bold" : "Helvetica-Bold",
						itemTitleSize: 10,
						bodySize: 10,
						bulletFont: useEmbeddedModernFonts ? "Modern-Regular" : "Helvetica",
						bulletSize: 10,
						bulletIndent: 12,
						linkColor: "#1155cc",
						defaultTextColor: "#000000",
						spacing: {
							headerNameToHeadline: 3,
							headerHeadlineToMeta: 3,
							headerToBody: 8,
							sectionTop: 8,
							sectionRuleOffset: 2,
							sectionToContent: 9,
							metaToBullets: 2,
							entryGap: 5,
						},
				  }
				: {
						headingFont: "Helvetica-Bold",
						bodyFont: "Helvetica",
						bodyItalicFont: "Helvetica-Oblique",
						itemTitleItalicFont: "Helvetica-BoldOblique",
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
						linkColor: "#1d4ed8",
						defaultTextColor: "#000000",
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
		margins: { top: 36, bottom: 36, left: 36, right: 36 },
		info: { Title: `${content.header.fullName || "Resume"} Resume` },
	});
	if (useEmbeddedModernFonts) {
		doc.registerFont("Modern-Regular", modernFontFiles.regular);
		doc.registerFont("Modern-Bold", modernFontFiles.bold);
		doc.registerFont("Modern-Italic", modernFontFiles.italic);
		doc.registerFont("Modern-BoldItalic", modernFontFiles.boldItalic);
	}
	const pageWidth =
		doc.page.width - doc.page.margins.left - doc.page.margins.right;
	const spacing = style.spacing;
	const isModernAts = templateKey === "deux_modern_v1";
	const headerPhotoSize = 58;
	const headerPhotoGap = 14;
	const headerPhotoBuffer = isModernAts
		? parseHeaderPhotoDataUrl(content.header.photoDataUrl)
		: null;
	const hasHeaderPhoto = Boolean(headerPhotoBuffer);
	const headerTextWidth = hasHeaderPhoto
		? pageWidth - headerPhotoSize - headerPhotoGap
		: pageWidth;
	const headerPhotoX = doc.page.margins.left + headerTextWidth + headerPhotoGap;
	const headerPhotoY = doc.y;
	let headerPhotoBottomY = doc.y;

	const addSpace = (points: number) => {
		doc.y += points;
	};

	const writeSplitLine = (
		left: string,
		right: string,
		options: {
			leftFont: string;
			leftSize: number;
			rightFont?: string;
			rightSize?: number;
			leftColor?: string;
			rightColor?: string;
			italicLeft?: boolean;
			italicRight?: boolean;
			lineGap?: number;
		},
	) => {
		const baseY = doc.y;
		const rightFont = options.rightFont ?? options.leftFont;
		const rightSize = options.rightSize ?? options.leftSize;
		const leftColor = options.leftColor ?? style.defaultTextColor;
		const rightColor = options.rightColor ?? style.defaultTextColor;
		const lineGap = options.lineGap ?? 0.25;

		doc
			.font(options.leftFont)
			.fontSize(options.leftSize)
			.fillColor(leftColor)
			.text(left, doc.page.margins.left, baseY, {
				width: pageWidth * 0.65,
				lineGap,
			});

		if (right.trim()) {
			doc
				.font(rightFont)
				.fontSize(rightSize)
				.fillColor(rightColor)
				.text(right, doc.page.margins.left, baseY, {
					width: pageWidth,
					align: "right",
					lineGap,
				});
		}
		doc.fillColor(style.defaultTextColor);
		doc.y = Math.max(doc.y, baseY + doc.currentLineHeight(true));
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
			doc.strokeColor(style.defaultTextColor).fillColor(style.defaultTextColor);
			renderedSectionCount += 1;
		};

	const writeMeta = (value: string) => {
		if (!value.trim()) return;
		doc.font(style.metaFont).fontSize(style.metaSize).text(value, {
			lineGap: isModernAts ? 0.25 : 0.8,
		});
	};

	const writeBullets = (bullets: string[]) => {
		if (!bullets.length) return;
		for (const bullet of bullets) {
				doc.font(style.bulletFont).fontSize(style.bulletSize).text(`• ${bullet}`, {
					align: "left",
					lineGap: isModernAts ? 0.2 : 1.15,
					indent: isModernAts ? 0 : style.bulletIndent,
				});
			}
		};

	if (headerPhotoBuffer) {
		try {
			doc.image(headerPhotoBuffer, headerPhotoX, headerPhotoY, {
				fit: [headerPhotoSize, headerPhotoSize],
				align: "center",
				valign: "center",
			});
			headerPhotoBottomY = headerPhotoY + headerPhotoSize;
		} catch {
			headerPhotoBottomY = doc.y;
		}
	}

	const displayName = content.header.fullName || "Your Name";
	doc
		.font(style.nameFont)
		.fontSize(style.nameSize)
		.text(isModernAts ? displayName.toUpperCase() : displayName, {
			align: style.nameAlign,
			width: headerTextWidth,
			lineGap: isModernAts ? 0 : 1,
		});
	if (isModernAts) {
		const plainParts = [
			content.header.location,
			content.header.phone,
			content.header.email,
		].filter(Boolean);
		const linkParts = [
			content.header.githubUrl,
			content.header.linkedinUrl,
			content.header.websiteUrl,
		].filter(Boolean);
		const headerRowGap = 2;

		// Keep header rhythm deterministic: fixed spacing between each row.
		addSpace(headerRowGap);
		if (plainParts.length) {
			doc
				.font(style.metaFont)
				.fontSize(style.metaSize)
				.fillColor(style.defaultTextColor)
				.text(plainParts.join(" | "), {
					align: style.metaAlign,
					width: headerTextWidth,
					lineGap: 0,
				});
		}

		if (linkParts.length) {
			addSpace(headerRowGap);
			linkParts.forEach((part, index) => {
				const isLast = index === linkParts.length - 1;
				const displayLink = formatHeaderLinkText(String(part));
				doc
					.font(style.metaFont)
					.fontSize(style.metaSize)
					.fillColor(style.linkColor)
					.text(displayLink, {
						underline: true,
						lineGap: 0,
						width: headerTextWidth,
						continued: !isLast,
					});
				if (!isLast) {
					const separator = " | ";
					doc
						.font(style.metaFont)
						.fontSize(style.metaSize)
						.fillColor(style.defaultTextColor)
						.text(separator, {
							underline: false,
							lineGap: 0,
							width: headerTextWidth,
							continued: true,
						});
				}
			});
			doc.fillColor(style.defaultTextColor);
		}

		addSpace(6);
		if (hasHeaderPhoto && doc.y < headerPhotoBottomY + 3) {
			doc.y = headerPhotoBottomY + 3;
		}
	} else {
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
	}
	if (isModernAts) {
		doc.strokeColor(style.defaultTextColor).fillColor(style.defaultTextColor);
	}

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
			writeSectionTitle(isModernAts ? "Work Experience" : "Experience");
			content.experience.forEach((item, index) => {
				if (isModernAts) {
					writeSplitLine(item.company || item.role, item.location, {
						leftFont: style.itemTitleFont,
						leftSize: style.itemTitleSize,
						rightFont: style.itemTitleFont,
						rightSize: style.itemTitleSize,
						lineGap: 0.2,
					});
					writeSplitLine(
						item.role,
						[item.startDate, item.isCurrent ? "Present" : item.endDate]
							.filter(Boolean)
							.join(" - "),
						{
							leftFont: style.bodyItalicFont,
							leftSize: style.bodySize,
							rightFont: style.bodyItalicFont,
							rightSize: style.bodySize,
							italicLeft: true,
							italicRight: true,
							lineGap: 0.2,
						},
					);
				} else {
					doc.font(style.itemTitleFont)
						.fontSize(style.itemTitleSize)
						.text(`${item.role} · ${item.company}`, { lineGap: 1 });
					writeMeta(
						[item.location, `${item.startDate} - ${item.isCurrent ? "Present" : item.endDate}`]
							.filter(Boolean)
							.join(" | "),
					);
				}
				addSpace(spacing.metaToBullets);
				writeBullets(item.bullets);
				if (index < content.experience.length - 1) {
					addSpace(spacing.entryGap);
				}
			});
		}
		if (section === "education" && content.education.length) {
			writeSectionTitle("Education");
			content.education.forEach((item, index) => {
				if (isModernAts) {
					writeSplitLine(item.school, item.location, {
						leftFont: style.itemTitleFont,
						leftSize: style.itemTitleSize,
						rightFont: style.itemTitleFont,
						rightSize: style.itemTitleSize,
						lineGap: 0.2,
					});
					writeSplitLine(
						item.degree,
						item.graduationDate ? `Graduated ${item.graduationDate}` : "",
						{
							leftFont: style.bodyItalicFont,
							leftSize: style.bodySize,
							rightFont: style.bodyItalicFont,
							rightSize: style.bodySize,
							italicLeft: true,
							italicRight: true,
							lineGap: 0.2,
						},
					);
					if (item.details.length) {
						addSpace(spacing.metaToBullets);
						writeBullets(item.details);
					}
				} else {
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
				}
				if (index < content.education.length - 1) {
					addSpace(spacing.entryGap);
				}
			});
		}
		if (section === "skills" && content.skills.length) {
			writeSectionTitle("Skills");
			if (templateKey === "deux_modern_v1") {
				const groups = groupResumeSkills(content.skills);
				if (groups.length) {
					for (const group of groups) {
						doc
							.font(style.itemTitleFont)
							.fontSize(style.bodySize)
							.fillColor(style.defaultTextColor)
							.text(`${group.category}: `, {
								continued: true,
								lineGap: 1.2,
							});
						doc
							.font(style.bodyFont)
							.fontSize(style.bodySize)
							.fillColor(style.defaultTextColor)
							.text(group.items.join(", "), { lineGap: 1.2 });
					}
				} else {
					doc.font(style.bodyFont).fontSize(style.bodySize).text(content.skills.join(", "), {
						lineGap: 1.25,
					});
				}
			} else {
				doc.font(style.bodyFont).fontSize(style.bodySize).text(content.skills.join(", "), {
					lineGap: 1.25,
				});
			}
		}
		if (section === "projects" && content.projects.length) {
			writeSectionTitle("Projects");
			content.projects.forEach((item, index) => {
				if (isModernAts) {
					const rightMeta = item.description;
					writeSplitLine(item.name, rightMeta, {
						leftFont: style.itemTitleFont,
						leftSize: style.itemTitleSize,
						rightFont: style.bodyItalicFont,
						rightSize: style.bodySize,
						italicRight: true,
						lineGap: 0.2,
					});
				} else {
					doc.font(style.itemTitleFont).fontSize(style.itemTitleSize).text(item.name, {
						lineGap: 1,
					});
					if (item.description) {
						doc.font(style.bodyFont).fontSize(style.bodySize).text(item.description, {
							lineGap: 1.25,
						});
					}
				}
				if (item.url) {
					doc.fillColor(style.linkColor).font(style.bodyFont).text(item.url, {
						lineGap: isModernAts ? 0.2 : 1,
						underline: isModernAts,
					});
					doc.fillColor(style.defaultTextColor);
				}
				addSpace(spacing.metaToBullets);
				writeBullets(item.highlights);
				if (index < content.projects.length - 1) {
					addSpace(spacing.entryGap);
				}
			});
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
			listSection.items.forEach((item, index) => {
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
					doc.fillColor(style.linkColor).font(style.bodyFont).text(item.url, {
						lineGap: 1,
					});
					doc.fillColor(style.defaultTextColor);
				}
				if (index < listSection.items.length - 1) {
					addSpace(spacing.entryGap);
				}
			});
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
