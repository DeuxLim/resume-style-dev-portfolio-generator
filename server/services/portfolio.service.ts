import type { RowDataPacket } from "mysql2";
import { getDb } from "../lib/db.js";
import {
	mapPortfolioRow,
	serializePortfolio,
	toPublicPortfolio,
} from "../lib/portfolio.js";
import { buildStarterPortfolio } from "../../shared/defaults/portfolio.js";
import type {
	EditablePortfolio,
	PublicPortfolio,
	SessionUser,
} from "../../shared/types/portfolio.types.js";

type PortfolioQueryRow = RowDataPacket & {
	user_id: number;
	email: string;
	password_hash?: string;
	username: string;
	full_name: string;
	headline: string;
	location: string;
	experience_summary: string;
	education: string;
	availability: string;
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

export const getPortfolioByUsername = async (
	username: string,
): Promise<PublicPortfolio | null> => {
	const db = getDb();
	const [rows] = await db.query<PortfolioQueryRow[]>(
		`
			SELECT
				u.id AS user_id,
				u.email,
				u.username,
				p.full_name,
				p.headline,
				p.location,
				p.experience_summary,
				p.education,
				p.availability,
				p.phone,
				p.avatar_url,
				p.cover_url,
				p.github_url,
				p.github_username,
				p.linkedin_url,
				p.about_json,
				p.timeline_json,
				p.experiences_json,
				p.tech_categories_json,
				p.projects_json,
				p.custom_sections_json,
				p.chat_enabled,
				p.gemini_api_key,
				p.created_at,
				p.updated_at
			FROM portfolios p
			INNER JOIN users u ON u.id = p.user_id
			WHERE u.username = ?
			LIMIT 1
		`,
		[username],
	);

	const row = rows[0];

	if (!row) {
		return null;
	}

	const portfolio: PublicPortfolio = {
		...toPublicPortfolio(mapPortfolioRow(row)),
	};

	if (row.created_at) {
		portfolio.createdAt = row.created_at.toISOString();
	}

	if (row.updated_at) {
		portfolio.updatedAt = row.updated_at.toISOString();
	}

	return portfolio;
};

export const getEditablePortfolioByUserId = async (
	userId: number,
): Promise<EditablePortfolio | null> => {
	const db = getDb();
	const [rows] = await db.query<PortfolioQueryRow[]>(
		`
			SELECT
				u.id AS user_id,
				u.email,
				u.username,
				p.full_name,
				p.headline,
				p.location,
				p.experience_summary,
				p.education,
				p.availability,
				p.phone,
				p.avatar_url,
				p.cover_url,
				p.github_url,
				p.github_username,
				p.linkedin_url,
				p.about_json,
				p.timeline_json,
				p.experiences_json,
				p.tech_categories_json,
				p.projects_json,
				p.custom_sections_json,
				p.chat_enabled,
				p.gemini_api_key,
				p.created_at,
				p.updated_at
			FROM portfolios p
			INNER JOIN users u ON u.id = p.user_id
			WHERE p.user_id = ?
			LIMIT 1
		`,
		[userId],
	);

	return rows[0] ? mapPortfolioRow(rows[0]) : null;
};

export const createStarterPortfolio = async (user: SessionUser) => {
	const db = getDb();
	const starter = buildStarterPortfolio(user.username, user.email, user.fullName);
	const serialized = serializePortfolio(starter);

	await db.query(
		`
			INSERT INTO portfolios (
				user_id,
				full_name,
				headline,
				location,
				experience_summary,
				education,
				availability,
				phone,
				avatar_url,
				cover_url,
				github_url,
				github_username,
				linkedin_url,
				about_json,
				timeline_json,
				experiences_json,
				tech_categories_json,
				projects_json,
				custom_sections_json,
				chat_enabled,
				gemini_api_key
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
		[
			user.id,
			serialized.fullName,
			serialized.headline,
			serialized.location,
			serialized.experienceSummary,
			serialized.education,
			serialized.availability,
			serialized.phone,
			serialized.avatarUrl,
			serialized.coverUrl,
			serialized.githubUrl,
			serialized.githubUsername,
			serialized.linkedinUrl,
			serialized.aboutJson,
			serialized.timelineJson,
			serialized.experiencesJson,
			serialized.techCategoriesJson,
			serialized.projectsJson,
			serialized.customSectionsJson,
			serialized.chatEnabled,
			serialized.geminiApiKey || null,
		],
	);

	return starter;
};

export const updatePortfolioByUserId = async (
	userId: number,
	portfolio: EditablePortfolio,
) => {
	const db = getDb();
	const serialized = serializePortfolio(portfolio);

	await db.query(
		`
			UPDATE portfolios
			SET
				full_name = ?,
				headline = ?,
				location = ?,
				experience_summary = ?,
				education = ?,
				availability = ?,
				phone = ?,
				avatar_url = ?,
				cover_url = ?,
				github_url = ?,
				github_username = ?,
				linkedin_url = ?,
				about_json = ?,
				timeline_json = ?,
				experiences_json = ?,
				tech_categories_json = ?,
				projects_json = ?,
				custom_sections_json = ?,
				chat_enabled = ?,
				gemini_api_key = ?,
				updated_at = CURRENT_TIMESTAMP
			WHERE user_id = ?
		`,
		[
			serialized.fullName,
			serialized.headline,
			serialized.location,
			serialized.experienceSummary,
			serialized.education,
			serialized.availability,
			serialized.phone,
			serialized.avatarUrl,
			serialized.coverUrl,
			serialized.githubUrl,
			serialized.githubUsername,
			serialized.linkedinUrl,
			serialized.aboutJson,
			serialized.timelineJson,
			serialized.experiencesJson,
			serialized.techCategoriesJson,
			serialized.projectsJson,
			serialized.customSectionsJson,
			serialized.chatEnabled,
			serialized.geminiApiKey || null,
			userId,
		],
	);

	return getEditablePortfolioByUserId(userId);
};
