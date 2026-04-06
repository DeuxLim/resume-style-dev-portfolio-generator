import { buildStarterPortfolio } from "../../shared/defaults/portfolio.js";
import type {
	CustomSection,
	EditablePortfolio,
	ExperienceItem,
	HeaderAction,
	PortfolioLayout,
	PortfolioRecord,
	ProjectItem,
	TechCategory,
	TimelineItem,
} from "../../shared/types/portfolio.types.js";

type PortfolioRow = {
	username: string;
	full_name: string;
	headline: string;
	location: string;
	experience_summary: string;
	education: string;
	availability: string;
	email: string;
	phone: string;
	avatar_url: string;
	cover_url: string;
	github_url: string;
	github_username: string;
	linkedin_url: string;
	header_actions_json: string | null;
	about_json: string | null;
	timeline_json: string | null;
	experiences_json: string | null;
	tech_categories_json: string | null;
	projects_json: string | null;
	custom_sections_json: string | null;
	layout_json: string | null;
	chat_enabled: number;
	gemini_api_key: string | null;
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

	// mysql2 may return JSON columns as already-parsed arrays/objects.
	if (typeof value === "object") {
		return value as T;
	}

	return fallback;
};

const normalizeCustomSections = (sections: CustomSection[]): CustomSection[] =>
	sections.map((section) => {
		const rawType = String((section as { type?: string }).type ?? "text");
		const type = rawType === "bullets" ? "bullets" : rawType === "links" ? "links" : "text";
		return {
			id: String(section.id),
			title: String(section.title ?? ""),
			type,
			body: String(section.body ?? ""),
			items: Array.isArray(section.items) ? section.items.map((item) => String(item ?? "")) : [],
			links: Array.isArray(section.links)
				? section.links.map((link) => ({
						id: String(link.id ?? ""),
						label: String(link.label ?? ""),
						url: String(link.url ?? ""),
					}))
				: [],
		};
	});

const normalizeHeaderActions = (actions: HeaderAction[]): HeaderAction[] => {
	const source = Array.isArray(actions) ? actions : [];
	return source
		.map((action, index) => {
			const type = String(action.type ?? "link");
			const safeType =
				type === "github" ||
				type === "linkedin" ||
				type === "email" ||
				type === "phone" ||
				type === "link"
					? type
					: "link";
			return {
				id: String(action.id ?? `action-${index + 1}`),
				label: String(action.label ?? ""),
				type: safeType,
				value: String(action.value ?? ""),
				display:
					String((action as { display?: unknown }).display ?? "label") === "value"
						? "value"
						: "label",
			} as HeaderAction;
		})
		.slice(0, 4);
};

const normalizeLayout = (
	value: unknown,
	fallback: PortfolioLayout,
): PortfolioLayout => {
	const parsed = parseJson<Partial<PortfolioLayout>>(value, fallback);
	const incoming = Array.isArray(parsed?.sectionOrder) ? parsed.sectionOrder : [];
	const allowed = new Set(fallback.sectionOrder);
	const deduped = incoming
		.map((entry) => String(entry).trim())
		.filter((entry): entry is PortfolioLayout["sectionOrder"][number] =>
			allowed.has(entry as PortfolioLayout["sectionOrder"][number]),
		)
		.filter((entry, index, arr) => arr.indexOf(entry) === index);
	const nextSpans = { ...fallback.sectionSpans };
	const rawSpans =
		parsed?.sectionSpans && typeof parsed.sectionSpans === "object"
			? parsed.sectionSpans
			: {};
	for (const section of fallback.sectionOrder) {
		const value = Number((rawSpans as Record<string, unknown>)[section]);
		if (value === 4 || value === 6 || value === 8 || value === 12) {
			nextSpans[section] = value;
		}
	}
	const nextHeights = { ...fallback.sectionHeights };
	const rawHeights =
		parsed?.sectionHeights && typeof parsed.sectionHeights === "object"
			? parsed.sectionHeights
			: {};
	for (const section of fallback.sectionOrder) {
		const height = Number((rawHeights as Record<string, unknown>)[section]);
		if (Number.isFinite(height)) {
			const safeHeight = Math.min(48, Math.max(4, Math.round(height)));
			nextHeights[section] = safeHeight;
		}
	}
	return {
		sectionOrder: deduped.length > 0 ? deduped : [...fallback.sectionOrder],
		sectionSpans: nextSpans,
		sectionHeights: nextHeights,
	};
};

export const serializePortfolio = (portfolio: EditablePortfolio) => ({
	fullName: portfolio.fullName.trim(),
	headline: portfolio.headline.trim(),
	location: portfolio.location.trim(),
	experienceSummary: portfolio.experienceSummary.trim(),
	education: portfolio.education.trim(),
	availability: portfolio.availability.trim(),
	email: portfolio.email.trim(),
	phone: portfolio.phone.trim(),
	avatarUrl: portfolio.avatarUrl.trim(),
	coverUrl: portfolio.coverUrl.trim(),
	githubUrl: portfolio.githubUrl.trim(),
	githubUsername: portfolio.githubUsername.trim(),
	linkedinUrl: portfolio.linkedinUrl.trim(),
	headerActionsJson: JSON.stringify(portfolio.headerActions),
	aboutJson: JSON.stringify(
		portfolio.about.map((paragraph) => paragraph.trim()).filter(Boolean),
	),
	timelineJson: JSON.stringify(portfolio.timeline),
	experiencesJson: JSON.stringify(portfolio.experiences),
	techCategoriesJson: JSON.stringify(portfolio.techCategories),
	projectsJson: JSON.stringify(portfolio.projects),
	customSectionsJson: JSON.stringify(portfolio.customSections),
	layoutJson: JSON.stringify(portfolio.layout),
	chatEnabled: portfolio.chatEnabled ? 1 : 0,
	geminiApiKey: portfolio.geminiApiKey.trim(),
});

export const mapPortfolioRow = (
	row: PortfolioRow,
): EditablePortfolio => {
	const fallback = buildStarterPortfolio(row.username, row.email, row.full_name);

	const portfolio: EditablePortfolio = {
		username: row.username,
		fullName: row.full_name,
		headline: row.headline,
		location: row.location,
		experienceSummary: row.experience_summary,
		education: row.education,
		availability: row.availability,
		email: row.email,
		phone: row.phone,
		avatarUrl: row.avatar_url,
		coverUrl: row.cover_url,
		githubUrl: row.github_url,
		githubUsername: row.github_username,
		linkedinUrl: row.linkedin_url,
		headerActions: parseJson<HeaderAction[]>(row.header_actions_json, []),
		about: parseJson<string[]>(row.about_json, fallback.about),
		timeline: parseJson<TimelineItem[]>(row.timeline_json, fallback.timeline),
		experiences: parseJson<ExperienceItem[]>(
			row.experiences_json,
			fallback.experiences,
		),
		techCategories: parseJson<TechCategory[]>(
			row.tech_categories_json,
			fallback.techCategories,
		),
		projects: parseJson<ProjectItem[]>(row.projects_json, fallback.projects),
		customSections: parseJson<CustomSection[]>(
			row.custom_sections_json,
			fallback.customSections,
		),
		layout: normalizeLayout(row.layout_json, fallback.layout),
		chatEnabled: Boolean(row.chat_enabled),
		geminiApiKey: row.gemini_api_key ?? "",
		hasCustomGeminiKey: Boolean(row.gemini_api_key),
	};

	if (row.created_at) {
		portfolio.createdAt = row.created_at.toISOString();
	}

	if (row.updated_at) {
		portfolio.updatedAt = row.updated_at.toISOString();
	}

	portfolio.customSections = normalizeCustomSections(portfolio.customSections);
	portfolio.headerActions = normalizeHeaderActions(
		portfolio.headerActions,
	);

	return portfolio;
};

export const toPublicPortfolio = (
	portfolio: EditablePortfolio,
): PortfolioRecord => ({
	username: portfolio.username,
	fullName: portfolio.fullName,
	headline: portfolio.headline,
	location: portfolio.location,
	experienceSummary: portfolio.experienceSummary,
	education: portfolio.education,
	availability: portfolio.availability,
	email: portfolio.email,
	phone: portfolio.phone,
	avatarUrl: portfolio.avatarUrl,
	coverUrl: portfolio.coverUrl,
	githubUrl: portfolio.githubUrl,
	githubUsername: portfolio.githubUsername,
	linkedinUrl: portfolio.linkedinUrl,
	headerActions: portfolio.headerActions,
	about: portfolio.about,
	timeline: portfolio.timeline,
	experiences: portfolio.experiences,
	techCategories: portfolio.techCategories,
	projects: portfolio.projects,
	customSections: portfolio.customSections,
	layout: portfolio.layout,
	chatEnabled: portfolio.chatEnabled,
});
