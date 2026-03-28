import { buildStarterPortfolio } from "../../shared/defaults/portfolio.js";
import type {
	CustomSection,
	EditablePortfolio,
	ExperienceItem,
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
	about_json: string | null;
	timeline_json: string | null;
	experiences_json: string | null;
	tech_categories_json: string | null;
	projects_json: string | null;
	custom_sections_json: string | null;
	chat_enabled: number;
	gemini_api_key: string | null;
	created_at?: Date;
	updated_at?: Date;
};

const parseJson = <T>(value: string | null, fallback: T): T => {
	if (!value) {
		return fallback;
	}

	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
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
	aboutJson: JSON.stringify(
		portfolio.about.map((paragraph) => paragraph.trim()).filter(Boolean),
	),
	timelineJson: JSON.stringify(portfolio.timeline),
	experiencesJson: JSON.stringify(portfolio.experiences),
	techCategoriesJson: JSON.stringify(portfolio.techCategories),
	projectsJson: JSON.stringify(portfolio.projects),
	customSectionsJson: JSON.stringify(portfolio.customSections),
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
	about: portfolio.about,
	timeline: portfolio.timeline,
	experiences: portfolio.experiences,
	techCategories: portfolio.techCategories,
	projects: portfolio.projects,
	customSections: portfolio.customSections,
	chatEnabled: portfolio.chatEnabled,
});
