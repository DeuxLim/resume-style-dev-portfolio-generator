import {
	defaultResumeSectionOrder,
	defaultResumeVisibility,
	resumeSectionKinds,
} from "../defaults/resume.js";
import type {
	ResumeContent,
	ResumeLayout,
	ResumeRecord,
	ResumeSectionKey,
	ResumeStructuredListItem,
	ResumeValidationIssue,
	ResumeValidationResult,
} from "../types/resume.types.js";

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

const isNonEmpty = (value: string) => value.trim().length > 0;

const countNonEmpty = (items: string[]) =>
	items.filter((item) => isNonEmpty(String(item ?? ""))).length;

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

export const normalizeResumeContent = (content: ResumeContent): ResumeContent => ({
	header: {
		fullName: String(content.header.fullName ?? "").trim(),
		headline: String(content.header.headline ?? "").trim(),
		location: String(content.header.location ?? "").trim(),
		email: String(content.header.email ?? "").trim(),
		phone: String(content.header.phone ?? "").trim(),
		websiteUrl: String(content.header.websiteUrl ?? "").trim(),
		linkedinUrl: String(content.header.linkedinUrl ?? "").trim(),
		githubUrl: String(content.header.githubUrl ?? "").trim(),
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
});

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
	if (content.experience.length === 0) {
		pushError(
			"experience.required",
			"experience",
			"At least one experience entry is required.",
		);
	}
	if (content.education.length === 0) {
		pushError(
			"education.required",
			"education",
			"At least one education entry is required.",
		);
	}
	if (countNonEmpty(content.skills) === 0) {
		pushError("skills.required", "skills", "At least one skill is required.");
	}

	if (content.summary.length > 300) {
		pushWarning(
			"summary.recommended",
			"summary",
			"Summary is longer than recommended (300 chars).",
		);
	}
	if (content.summary.length > 600) {
		pushError(
			"summary.max",
			"summary",
			"Summary exceeds max length (600 chars).",
		);
	}

	if (content.experience.length < 2) {
		pushWarning(
			"experience.min_recommended",
			"experience",
			"2-5 experience entries is recommended.",
		);
	}
	if (content.experience.length > 5) {
		pushWarning(
			"experience.max_recommended",
			"experience",
			"2-5 experience entries is recommended.",
		);
	}
	if (content.experience.length > 7) {
		pushError(
			"experience.max",
			"experience",
			"Experience entries exceed max (7).",
		);
	}
	for (const item of content.experience) {
		const bulletCount = item.bullets.length;
		if (bulletCount < 3 || bulletCount > 6) {
			pushWarning(
				"experience.bullets_recommended",
				"experience",
				`Role "${item.role || "Untitled"}" should have 3-6 bullets.`,
			);
		}
		if (bulletCount > 8) {
			pushError(
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
				pushError(
					"experience.bullet_max",
					"experience",
					"An experience bullet exceeds max length (220 chars).",
				);
			}
		}
	}

	if (content.projects.length < 2 && content.projects.length > 0) {
		pushWarning(
			"projects.min_recommended",
			"projects",
			"2-4 projects is recommended.",
		);
	}
	if (content.projects.length > 4) {
		pushWarning(
			"projects.max_recommended",
			"projects",
			"2-4 projects is recommended.",
		);
	}
	if (content.projects.length > 6) {
		pushError("projects.max", "projects", "Projects exceed max (6).");
	}

	const skillCount = content.skills.length;
	if (skillCount < 8) {
		pushWarning(
			"skills.min_recommended",
			"skills",
			"8-24 skills is recommended.",
		);
	}
	if (skillCount > 24) {
		pushWarning(
			"skills.max_recommended",
			"skills",
			"8-24 skills is recommended.",
		);
	}
	if (skillCount > 40) {
		pushError("skills.max", "skills", "Skills exceed max (40).");
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
			pushError(
				"custom.max",
				"custom",
				"Custom section body exceeds max (500 chars).",
			);
		}
	}

	const estimatedLines = estimateTotalLines(content, layout);
	const estimatedPages = Math.max(1, Math.ceil(estimatedLines / 58));
	if (estimatedPages > 2) {
		pushError(
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
