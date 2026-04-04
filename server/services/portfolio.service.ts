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
	PortfolioVersionSummary,
	PublicPortfolio,
	SessionUser,
} from "../../shared/types/portfolio.types.js";

type PortfolioQueryRow = RowDataPacket & {
	id?: number;
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
	layout_json: string | null;
	chat_enabled: number;
	gemini_api_key: string | null;
	created_at?: Date;
	updated_at?: Date;
};

type PortfolioVersionRow = RowDataPacket & {
	id: number;
	user_id: number;
	name: string;
	is_active: number;
	snapshot_json: string | null;
	created_at?: Date;
	updated_at?: Date;
};

let versionsTableReady: Promise<void> | null = null;
let portfoliosLayoutColumnReady: Promise<void> | null = null;

const ensurePortfoliosLayoutColumn = async () => {
	if (portfoliosLayoutColumnReady) {
		await portfoliosLayoutColumnReady;
		return;
	}

	const db = getDb();
	portfoliosLayoutColumnReady = (async () => {
		const [rows] = await db.query<RowDataPacket[]>(
			`
				SELECT COUNT(*) AS total
				FROM information_schema.COLUMNS
				WHERE TABLE_SCHEMA = DATABASE()
					AND TABLE_NAME = 'portfolios'
					AND COLUMN_NAME = 'layout_json'
			`,
		);
		const exists = Number(rows[0]?.total ?? 0) > 0;
		if (exists) return;
		await db.query(
			`
				ALTER TABLE portfolios
				ADD COLUMN layout_json JSON NULL AFTER custom_sections_json
			`,
		);
	})();

	await portfoliosLayoutColumnReady;
};

const ensurePortfolioVersionsTable = async () => {
	if (versionsTableReady) {
		await versionsTableReady;
		return;
	}

	const db = getDb();
	versionsTableReady = db
		.query(
			`
				CREATE TABLE IF NOT EXISTS portfolio_versions (
					id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
					user_id INT UNSIGNED NOT NULL,
					name VARCHAR(120) NOT NULL,
					is_active TINYINT(1) NOT NULL DEFAULT 0,
					snapshot_json JSON NOT NULL,
					created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
					INDEX idx_portfolio_versions_user (user_id),
					CONSTRAINT fk_portfolio_versions_user
						FOREIGN KEY (user_id) REFERENCES users(id)
						ON DELETE CASCADE
				)
			`,
		)
		.then(() => undefined);

	await versionsTableReady;
};

const buildVersionName = (count: number) => `Version ${count + 1}`;

const toVersionSummary = (
	row: PortfolioVersionRow,
): PortfolioVersionSummary => {
	const summary: PortfolioVersionSummary = {
		id: row.id,
		name: row.name,
		isActive: Boolean(row.is_active),
	};

	if (row.created_at) {
		summary.createdAt = row.created_at.toISOString();
	}

	if (row.updated_at) {
		summary.updatedAt = row.updated_at.toISOString();
	}

	return summary;
};

const sanitizeVersionName = (name: string) => {
	const value = name.trim();
	return value ? value.slice(0, 120) : "";
};

const getNextAutoVersionName = async (userId: number) => {
	const db = getDb();
	const [rows] = await db.query<RowDataPacket[]>(
		"SELECT name FROM portfolio_versions WHERE user_id = ?",
		[userId],
	);

	let maxVersionNumber = 0;

	for (const row of rows) {
		const name = String(row.name ?? "").trim();
		const match = /^version\s+(\d+)$/i.exec(name);
		if (!match) continue;
		const parsed = Number(match[1]);
		if (Number.isFinite(parsed) && parsed > maxVersionNumber) {
			maxVersionNumber = parsed;
		}
	}

	return buildVersionName(maxVersionNumber);
};

export const getPortfolioByUsername = async (
	username: string,
): Promise<PublicPortfolio | null> => {
	await ensurePortfoliosLayoutColumn();
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
				p.layout_json,
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
	await ensurePortfoliosLayoutColumn();
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
				p.layout_json,
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

const insertVersionSnapshot = async (
	userId: number,
	portfolio: EditablePortfolio,
	options?: { name?: string; isActive?: boolean },
) => {
	await ensurePortfolioVersionsTable();
	const db = getDb();
	const providedName = sanitizeVersionName(options?.name ?? "");
	const name = providedName || (await getNextAutoVersionName(userId));
	const snapshotJson = JSON.stringify(portfolio);
	const isActive = options?.isActive ? 1 : 0;

	if (isActive) {
		await db.query(
			"UPDATE portfolio_versions SET is_active = 0 WHERE user_id = ?",
			[userId],
		);
	}

	await db.query(
		`
			INSERT INTO portfolio_versions (user_id, name, is_active, snapshot_json)
			VALUES (?, ?, ?, ?)
		`,
		[userId, name, isActive, snapshotJson],
	);
};

const applyPortfolioUpdateByUserId = async (
	userId: number,
	portfolio: EditablePortfolio,
) => {
	await ensurePortfoliosLayoutColumn();
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
				layout_json = ?,
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
			serialized.layoutJson,
			serialized.chatEnabled,
			serialized.geminiApiKey || null,
			userId,
		],
	);
};

export const syncActiveVersionByUserId = async (
	userId: number,
	portfolio: EditablePortfolio,
) => {
	await ensurePortfolioVersionsTable();
	const db = getDb();
	const snapshotJson = JSON.stringify(portfolio);
	const [activeRows] = await db.query<PortfolioVersionRow[]>(
		`
			SELECT id
			FROM portfolio_versions
			WHERE user_id = ? AND is_active = 1
			ORDER BY updated_at DESC
			LIMIT 1
		`,
		[userId],
	);

	const activeRow = activeRows[0];

	if (!activeRow) {
		await insertVersionSnapshot(userId, portfolio, { isActive: true });
		return;
	}

	await db.query(
		`
			UPDATE portfolio_versions
			SET snapshot_json = ?, updated_at = CURRENT_TIMESTAMP
			WHERE id = ? AND user_id = ?
		`,
		[snapshotJson, activeRow.id, userId],
	);
};

export const listPortfolioVersionsByUserId = async (
	userId: number,
): Promise<PortfolioVersionSummary[]> => {
	await ensurePortfolioVersionsTable();
	const db = getDb();
	const [rows] = await db.query<PortfolioVersionRow[]>(
		`
			SELECT id, user_id, name, is_active, snapshot_json, created_at, updated_at
			FROM portfolio_versions
			WHERE user_id = ?
			ORDER BY is_active DESC, updated_at DESC, id DESC
		`,
		[userId],
	);

	return rows.map(toVersionSummary);
};

export const createPortfolioVersionByUserId = async (
	userId: number,
	input?: { name?: string },
): Promise<PortfolioVersionSummary[]> => {
	const portfolio = await getEditablePortfolioByUserId(userId);

	if (!portfolio) {
		return [];
	}

	await insertVersionSnapshot(userId, portfolio, {
		...(input?.name ? { name: input.name } : {}),
		isActive: false,
	});

	return listPortfolioVersionsByUserId(userId);
};

export const activatePortfolioVersionByUserId = async (
	userId: number,
	versionId: number,
): Promise<EditablePortfolio | null> => {
	await ensurePortfolioVersionsTable();
	const db = getDb();
	const [rows] = await db.query<PortfolioVersionRow[]>(
		`
			SELECT id, user_id, name, is_active, snapshot_json, created_at, updated_at
			FROM portfolio_versions
			WHERE id = ? AND user_id = ?
			LIMIT 1
		`,
		[versionId, userId],
	);
	const version = rows[0];

	if (!version) {
		return null;
	}

	const current = await getEditablePortfolioByUserId(userId);
	if (!current) {
		return null;
	}

	let snapshot: Partial<EditablePortfolio> = {};

	if (version.snapshot_json) {
		try {
			snapshot = JSON.parse(version.snapshot_json) as Partial<EditablePortfolio>;
		} catch {
			snapshot = {};
		}
	}

	const nextPortfolio: EditablePortfolio = {
		...current,
		...snapshot,
		username: current.username,
		email: current.email,
		hasCustomGeminiKey: Boolean(
			String(snapshot.geminiApiKey ?? current.geminiApiKey ?? "").trim(),
		),
	};

	await db.query(
		"UPDATE portfolio_versions SET is_active = 0 WHERE user_id = ?",
		[userId],
	);
	await db.query(
		`
			UPDATE portfolio_versions
			SET is_active = 1, updated_at = CURRENT_TIMESTAMP
			WHERE id = ? AND user_id = ?
		`,
		[versionId, userId],
	);

	await applyPortfolioUpdateByUserId(userId, nextPortfolio);
	return getEditablePortfolioByUserId(userId);
};

export const deletePortfolioVersionByUserId = async (
	userId: number,
	versionId: number,
): Promise<"deleted" | "not_found" | "active_version"> => {
	await ensurePortfolioVersionsTable();
	const db = getDb();
	const [rows] = await db.query<PortfolioVersionRow[]>(
		`
			SELECT id, user_id, name, is_active, snapshot_json, created_at, updated_at
			FROM portfolio_versions
			WHERE id = ? AND user_id = ?
			LIMIT 1
		`,
		[versionId, userId],
	);
	const version = rows[0];

	if (!version) {
		return "not_found";
	}

	if (version.is_active) {
		return "active_version";
	}

	await db.query(
		`
			DELETE FROM portfolio_versions
			WHERE id = ? AND user_id = ?
			LIMIT 1
		`,
		[versionId, userId],
	);

	return "deleted";
};

export const createStarterPortfolio = async (user: SessionUser) => {
	await ensurePortfoliosLayoutColumn();
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
				layout_json,
				chat_enabled,
				gemini_api_key
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
			serialized.layoutJson,
			serialized.chatEnabled,
			serialized.geminiApiKey || null,
		],
	);

	await insertVersionSnapshot(user.id, starter, {
		name: "Version 1",
		isActive: true,
	});

	return starter;
};

export const updatePortfolioByUserId = async (
	userId: number,
	portfolio: EditablePortfolio,
) => {
	await applyPortfolioUpdateByUserId(userId, portfolio);
	await syncActiveVersionByUserId(userId, portfolio);

	return getEditablePortfolioByUserId(userId);
};

export const updatePortfolioAvatarByUserId = async (
	userId: number,
	avatarUrl: string,
) => {
	const current = await getEditablePortfolioByUserId(userId);

	if (!current) {
		return null;
	}

	const nextPortfolio: EditablePortfolio = {
		...current,
		avatarUrl,
	};

	await applyPortfolioUpdateByUserId(userId, nextPortfolio);
	await syncActiveVersionByUserId(userId, nextPortfolio);

	return getEditablePortfolioByUserId(userId);
};

export const updatePortfolioCoverByUserId = async (
	userId: number,
	coverUrl: string,
) => {
	const current = await getEditablePortfolioByUserId(userId);

	if (!current) {
		return null;
	}

	const nextPortfolio: EditablePortfolio = {
		...current,
		coverUrl,
	};

	await applyPortfolioUpdateByUserId(userId, nextPortfolio);
	await syncActiveVersionByUserId(userId, nextPortfolio);

	return getEditablePortfolioByUserId(userId);
};
