import {
	defaultResumeSectionOrder,
	defaultResumeVisibility,
	resumeSectionKinds,
} from "../defaults/resume.js";
import type {
	ResumeContent,
	ResumeDynamicCategoryValue,
	ResumeDynamicSection,
	ResumeLayout,
	ResumeRecord,
	ResumeSectionKey,
	ResumeStructuredListItem,
	ResumeValidationIssue,
	ResumeValidationResult,
} from "../types/resume.types.js";

export type ResumeSkillCategory = {
	category: string;
	items: string[];
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

const isNonEmpty = (value: string) => value.trim().length > 0;

const normalizedListItems = (items: ResumeStructuredListItem[]) =>
	items
		.map((item) => ({
			...item,
			title: String(item.title ?? "").trim(),
			subtitle: String(item.subtitle ?? "").trim(),
			date: String(item.date ?? "").trim(),
			location: String(item.location ?? "").trim(),
			url: String(item.url ?? "").trim(),
			details: Array.isArray(item.details)
				? item.details.map((detail) => String(detail ?? "").trim()).filter(Boolean)
				: [],
		}))
		.filter((item) =>
			item.title || item.subtitle || item.date || item.location || item.url || item.details.length,
		);

const MAX_HEADER_ITEMS = 3;
const MAX_DYNAMIC_CATEGORY_ROWS = 8;
const MAX_DYNAMIC_BULLETS = 12;
const makeRuntimeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeHeaderItems = (items: unknown) =>
	(Array.isArray(items) ? items : [])
		.map((item) => String(item ?? "").trim())
		.filter(Boolean)
		.slice(0, MAX_HEADER_ITEMS);

const emailLike = (value: string) => /.+@.+\..+/.test(value.trim());
const phoneLike = (value: string) =>
	value.replace(/[^\d]/g, "").length >= 7;

const normalizeDynamicCategoryValues = (
	rows: ResumeDynamicCategoryValue[],
): ResumeDynamicCategoryValue[] =>
	(Array.isArray(rows) ? rows : [])
		.map((row) => ({
			id: String(row.id ?? "").trim() || makeRuntimeId(),
			category: String(row.category ?? "").trim(),
			values: (Array.isArray(row.values) ? row.values : [])
				.map((entry) => String(entry ?? "").trim())
				.filter(Boolean)
				.slice(0, 20),
		}))
		.filter((row) => row.category || row.values.length)
		.slice(0, MAX_DYNAMIC_CATEGORY_ROWS);

const normalizeDynamicSections = (
	sections: ResumeDynamicSection[],
): ResumeDynamicSection[] =>
	(Array.isArray(sections) ? sections : [])
		.map((section) => {
			const headerMode: ResumeDynamicSection["headerMode"] =
				section.headerMode === "split" ? "split" : "none";
			const bodyMode: ResumeDynamicSection["bodyMode"] =
				section.bodyMode === "bullets" || section.bodyMode === "categories"
					? section.bodyMode
					: "text";
			return {
				id: String(section.id ?? "").trim() || makeRuntimeId(),
				title: String(section.title ?? "").trim(),
				headerMode,
				bodyMode,
				showSubheader: Boolean(section.showSubheader),
				leftHeader: String(section.leftHeader ?? "").trim(),
				rightHeader: String(section.rightHeader ?? "").trim(),
				leftSubheader: String(section.leftSubheader ?? "").trim(),
				rightSubheader: String(section.rightSubheader ?? "").trim(),
				text: String(section.text ?? "").trim(),
				bullets: (Array.isArray(section.bullets) ? section.bullets : [])
					.map((entry) => String(entry ?? "").trim())
					.filter(Boolean)
					.slice(0, MAX_DYNAMIC_BULLETS),
				categories: normalizeDynamicCategoryValues(
					Array.isArray(section.categories) ? section.categories : [],
				),
			};
		})
		.filter(
			(section) =>
				section.title ||
				section.text ||
				section.bullets.length > 0 ||
				section.categories.length > 0 ||
				section.leftHeader ||
				section.rightHeader,
		);

const defaultSkillCategoryOrder = [
	"Languages & Frameworks",
	"Databases",
	"Tools & Technologies",
	"Frontend",
	"Core",
];

const skillToCategory = (skill: string): string | null => {
	const value = skill.trim().toLowerCase();
	const normalized = value.replace(/\s+/g, " ");
	if (!normalized) return null;

	const inSet = (set: string[]) => set.includes(normalized);

	if (
		inSet([
			"php",
			"laravel",
			"javascript",
			"typescript",
			"react",
			"node.js",
			"nodejs",
			"express",
		])
	) {
		return "Languages & Frameworks";
	}

	if (inSet(["mysql", "mongodb", "postgresql", "postgres", "sqlite"])) {
		return "Databases";
	}

	if (
		inSet([
			"git",
			"github",
			"gitlab",
			"docker",
			"postman",
			"vercel",
			"claude code",
			"openai codex",
			"vite",
			"npm",
			"yarn",
		])
	) {
		return "Tools & Technologies";
	}

	if (
		inSet([
			"html",
			"html5",
			"css",
			"css3",
			"tailwind css",
			"bootstrap",
			"shadcn/ui",
			"shadcn",
		])
	) {
		return "Frontend";
	}

	if (
		inSet([
			"api integrations",
			"real-time applications",
			"database design",
			"system design",
			"automation workflows",
		])
	) {
		return "Core";
	}

	return null;
};

export const groupResumeSkills = (skills: string[]): ResumeSkillCategory[] => {
	const grouped = new Map<string, string[]>();
	const seen = new Set<string>();
	const getUniquePush = (category: string, item: string) => {
		const key = `${category.toLowerCase()}::${item.toLowerCase()}`;
		if (seen.has(key)) return;
		seen.add(key);
		const list = grouped.get(category) ?? [];
		list.push(item);
		grouped.set(category, list);
	};

	for (const raw of skills) {
		const entry = String(raw ?? "").trim();
		if (!entry) continue;
		const colonIndex = entry.indexOf(":");
		if (colonIndex > 0) {
			const category = entry.slice(0, colonIndex).trim();
			const values = entry
				.slice(colonIndex + 1)
				.split(",")
				.map((item) => item.trim())
				.filter(Boolean);
			if (category && values.length) {
				for (const value of values) {
					getUniquePush(category, value);
				}
				continue;
			}
		}

		const mapped = skillToCategory(entry) ?? "Other";
		getUniquePush(mapped, entry);
	}

	const orderedCategories = [
		...defaultSkillCategoryOrder.filter((category) => grouped.has(category)),
		...Array.from(grouped.keys()).filter(
			(category) => !defaultSkillCategoryOrder.includes(category),
		),
	];

	return orderedCategories
		.map((category) => ({ category, items: grouped.get(category) ?? [] }))
		.filter((group) => group.items.length > 0);
};

export const normalizeResumeLayout = (
	layout: Partial<ResumeLayout> | null | undefined,
): ResumeLayout => {
	const incomingOrder = Array.isArray(layout?.sectionOrder)
		? layout.sectionOrder
		: [];
	const order = incomingOrder
		.map((section) => String(section) as ResumeSectionKey)
		.filter((section) => defaultResumeSectionOrder.includes(section))
		.filter((section, index, list) => list.indexOf(section) === index);
	const normalizedOrder = order.length ? order : [...defaultResumeSectionOrder];
	const visibility = { ...defaultResumeVisibility };
	for (const section of defaultResumeSectionOrder) {
		const value = layout?.visibility?.[section];
		if (typeof value === "boolean") {
			visibility[section] =
				resumeSectionKinds[section] === "mandatory" ? true : value;
		}
	}
	const positions: ResumeLayout["positions"] = {};
	for (const section of normalizedOrder) {
		const value = Number(layout?.positions?.[section]);
		if (Number.isFinite(value)) {
			positions[section] = clamp(Math.round(value), 0, 99);
		}
	}

	return {
		mode: layout?.mode === "manual" ? "manual" : "default",
		sectionOrder: normalizedOrder,
		visibility,
		positions,
	};
};

export const normalizeResumeContent = (content: ResumeContent): ResumeContent => {
	const location = String(content.header.location ?? "").trim();
	const email = String(content.header.email ?? "").trim();
	const phone = String(content.header.phone ?? "").trim();
	const websiteUrl = String(content.header.websiteUrl ?? "").trim();
	const linkedinUrl = String(content.header.linkedinUrl ?? "").trim();
	const githubUrl = String(content.header.githubUrl ?? "").trim();
	const legacyContactItems = [location, phone, email].filter(Boolean);
	const legacyLinkItems = [githubUrl, linkedinUrl, websiteUrl].filter(Boolean);
	const normalizedContactItems = normalizeHeaderItems(content.header.contactItems);
	const normalizedLinkItems = normalizeHeaderItems(content.header.linkItems);
	const contactItems = normalizedContactItems.length
		? normalizedContactItems
		: legacyContactItems;
	const linkItems = normalizedLinkItems.length ? normalizedLinkItems : legacyLinkItems;
	const inferredEmail = contactItems.find((item) => emailLike(item)) ?? "";
	const inferredPhone = contactItems.find((item) => phoneLike(item)) ?? "";

	return {
		header: {
			fullName: String(content.header.fullName ?? "").trim(),
			headline: String(content.header.headline ?? "").trim(),
			location,
			email: email || inferredEmail,
			phone: phone || inferredPhone,
			websiteUrl,
			linkedinUrl,
			githubUrl,
			photoDataUrl: String(content.header.photoDataUrl ?? "").trim(),
			contactItems: contactItems.slice(0, MAX_HEADER_ITEMS),
			linkItems: linkItems.slice(0, MAX_HEADER_ITEMS),
		},
		summary: String(content.summary ?? "").trim(),
		experience: (Array.isArray(content.experience) ? content.experience : []).map(
			(item) => ({
				...item,
				role: String(item.role ?? "").trim(),
				company: String(item.company ?? "").trim(),
				location: String(item.location ?? "").trim(),
				startDate: String(item.startDate ?? "").trim(),
				endDate: String(item.endDate ?? "").trim(),
				isCurrent: Boolean(item.isCurrent),
				bullets: Array.isArray(item.bullets)
					? item.bullets
							.map((bullet) => String(bullet ?? "").trim())
							.filter(Boolean)
					: [],
			}),
		),
		education: (Array.isArray(content.education) ? content.education : []).map(
			(item) => ({
				...item,
				school: String(item.school ?? "").trim(),
				degree: String(item.degree ?? "").trim(),
				location: String(item.location ?? "").trim(),
				graduationDate: String(item.graduationDate ?? "").trim(),
				details: Array.isArray(item.details)
					? item.details.map((entry) => String(entry ?? "").trim()).filter(Boolean)
					: [],
			}),
		),
		skills: (Array.isArray(content.skills) ? content.skills : [])
			.map((item) => String(item ?? "").trim())
			.filter(Boolean),
		projects: (Array.isArray(content.projects) ? content.projects : []).map(
			(item) => ({
				...item,
				name: String(item.name ?? "").trim(),
				description: String(item.description ?? "").trim(),
				url: String(item.url ?? "").trim(),
				highlights: Array.isArray(item.highlights)
					? item.highlights
							.map((entry) => String(entry ?? "").trim())
							.filter(Boolean)
					: [],
			}),
		),
		certifications: normalizedListItems(
			Array.isArray(content.certifications) ? content.certifications : [],
		),
		awards: normalizedListItems(Array.isArray(content.awards) ? content.awards : []),
		volunteer: normalizedListItems(
			Array.isArray(content.volunteer) ? content.volunteer : [],
		),
		languages: (Array.isArray(content.languages) ? content.languages : [])
			.map((item) => String(item ?? "").trim())
			.filter(Boolean),
		publications: normalizedListItems(
			Array.isArray(content.publications) ? content.publications : [],
		),
		custom: normalizedListItems(Array.isArray(content.custom) ? content.custom : []),
		customSections: normalizeDynamicSections(
			Array.isArray(content.customSections) ? content.customSections : [],
		),
	};
};

const estimateTotalLines = (content: ResumeContent, layout: ResumeLayout) => {
	let lines = 0;
	const isVisible = (section: ResumeSectionKey) =>
		section === "header" ? true : Boolean(layout.visibility[section]);
	if (isVisible("header")) {
		lines += 4;
	}
	if (isVisible("summary") && content.summary) {
		lines += Math.ceil(content.summary.length / 75) + 2;
	}
	if (isVisible("experience")) {
		for (const item of content.experience) {
			lines += 2;
			for (const bullet of item.bullets) {
				lines += Math.max(1, Math.ceil(bullet.length / 90));
			}
		}
	}
	if (isVisible("education")) {
		for (const item of content.education) {
			lines += 2 + item.details.length;
		}
	}
	if (isVisible("skills") && content.skills.length) {
		lines += Math.ceil(content.skills.join(", ").length / 92) + 1;
	}
	if (isVisible("projects")) {
		for (const item of content.projects) {
			lines += 2 + item.highlights.length;
			if (item.description) {
				lines += Math.ceil(item.description.length / 85);
			}
		}
	}
	for (const section of [
		"certifications",
		"awards",
		"volunteer",
		"publications",
		"custom",
	] as const) {
		if (!isVisible(section)) continue;
		for (const item of content[section]) {
			lines += 2 + item.details.length;
		}
	}
	if (isVisible("custom") && content.customSections.length) {
		for (const section of content.customSections) {
			lines += 2;
			if (section.headerMode === "split") {
				lines += section.showSubheader ? 2 : 1;
			}
			if (section.bodyMode === "text" && section.text) {
				lines += Math.max(1, Math.ceil(section.text.length / 90));
			}
			if (section.bodyMode === "bullets") {
				lines += section.bullets.length;
			}
			if (section.bodyMode === "categories") {
				lines += section.categories.length;
			}
		}
	}
	if (isVisible("languages") && content.languages.length) {
		lines += Math.ceil(content.languages.join(", ").length / 92) + 1;
	}

	return lines;
};

export const validateResume = (resume: ResumeRecord): ResumeValidationResult => {
	const issues: ResumeValidationIssue[] = [];
	const content = normalizeResumeContent(resume.content);
	const layout = normalizeResumeLayout(resume.layout);

	const pushWarning = (
		code: string,
		section: ResumeSectionKey | "global",
		message: string,
	) => {
		issues.push({ level: "warning", code, section, message });
	};
	const pushError = (
		code: string,
		section: ResumeSectionKey | "global",
		message: string,
	) => {
		issues.push({ level: "error", code, section, message });
	};

	if (!isNonEmpty(content.header.fullName)) {
		pushError("header.full_name_required", "header", "Full name is required.");
	}
	if (!isNonEmpty(content.header.email)) {
		pushError("header.email_required", "header", "Email is required.");
	}
	if (!isNonEmpty(content.header.headline)) {
		pushWarning(
			"header.headline_recommended",
			"header",
			"Add a clear target role headline for better ATS relevance.",
		);
	}
	if (content.header.contactItems.length === 0) {
		pushWarning(
			"header.contact_items_recommended",
			"header",
			"Add contact details (location and phone are recommended for ATS screening).",
		);
	}
	if (content.header.contactItems.length > MAX_HEADER_ITEMS) {
		pushWarning(
			"header.contact_items_max",
			"header",
			`Header contact entries exceed max (${MAX_HEADER_ITEMS}).`,
		);
	}
	if (content.header.linkItems.length > MAX_HEADER_ITEMS) {
		pushWarning(
			"header.link_items_max",
			"header",
			`Header link entries exceed max (${MAX_HEADER_ITEMS}).`,
		);
	}
	if (content.header.contactItems.some((entry) => entry.length > 90)) {
		pushWarning(
			"header.contact_item_max_length",
			"header",
			"A header contact entry exceeds max length (90 chars).",
		);
	}
	if (content.header.linkItems.some((entry) => entry.length > 90)) {
		pushWarning(
			"header.link_item_max_length",
			"header",
			"A header link entry exceeds max length (90 chars).",
		);
	}
	if (content.summary.length > 300) {
		pushWarning(
			"summary.recommended",
			"summary",
			"Summary is longer than recommended (300 chars).",
		);
	}
	if (content.summary.length > 600) {
		pushWarning(
			"summary.max",
			"summary",
			"Summary exceeds max length (600 chars).",
		);
	}

	if (content.experience.length > 7) {
		pushWarning(
			"experience.max",
			"experience",
			"Experience entries exceed max (7).",
		);
	}
	for (const item of content.experience) {
		const bulletCount = item.bullets.length;
		if (bulletCount > 8) {
			pushWarning(
				"experience.bullets_max",
				"experience",
				`Role "${item.role || "Untitled"}" exceeds max bullets (8).`,
			);
		}
		for (const bullet of item.bullets) {
			if (bullet.length > 140) {
				pushWarning(
					"experience.bullet_recommended",
					"experience",
					"An experience bullet is longer than recommended (140 chars).",
				);
			}
			if (bullet.length > 220) {
				pushWarning(
					"experience.bullet_max",
					"experience",
					"An experience bullet exceeds max length (220 chars).",
				);
			}
		}
	}

	if (content.projects.length > 6) {
		pushWarning("projects.max", "projects", "Projects exceed max (6).");
	}

	const skillCount = content.skills.length;
	if (skillCount > 40) {
		pushWarning("skills.max", "skills", "Skills exceed max (40).");
	}

	for (const item of content.custom) {
		const customBody = item.details.join(" ");
		if (customBody.length > 300) {
			pushWarning(
				"custom.recommended",
				"custom",
				"Custom section body is longer than recommended (300 chars).",
			);
		}
		if (customBody.length > 500) {
			pushWarning(
				"custom.max",
				"custom",
				"Custom section body exceeds max (500 chars).",
			);
		}
	}
	for (const section of content.customSections) {
		if (!section.title) {
			pushWarning(
				"custom_sections.title_recommended",
				"custom",
				"Custom section title is recommended.",
			);
		}
		if (section.title.length > 60) {
			pushWarning(
				"custom_sections.title_max",
				"custom",
				"Custom section title exceeds max length (60 chars).",
			);
		}
		if (section.bodyMode === "text" && section.text.length > 800) {
			pushWarning(
				"custom_sections.text_max",
				"custom",
				"Custom section text exceeds max length (800 chars).",
			);
		}
		if (section.bodyMode === "bullets" && section.bullets.length > MAX_DYNAMIC_BULLETS) {
			pushWarning(
				"custom_sections.bullets_max",
				"custom",
				`Custom section bullets exceed max (${MAX_DYNAMIC_BULLETS}).`,
			);
		}
		if (
			section.bodyMode === "categories" &&
			section.categories.length > MAX_DYNAMIC_CATEGORY_ROWS
		) {
			pushWarning(
				"custom_sections.categories_max",
				"custom",
				`Custom section category rows exceed max (${MAX_DYNAMIC_CATEGORY_ROWS}).`,
			);
		}
	}

	const estimatedLines = estimateTotalLines(content, layout);
	const estimatedPages = Math.max(1, Math.ceil(estimatedLines / 58));
	if (estimatedPages > 2) {
		pushWarning(
			"pdf.page_limit",
			"global",
			"Resume exceeds max PDF length (2 pages). Shorten content before export.",
		);
	}

	const warnings = issues.filter((issue) => issue.level === "warning");
	const errors = issues.filter((issue) => issue.level === "error");

	return {
		warnings,
		errors,
		estimatedPages,
		canExportPdf: errors.length === 0,
	};
};
