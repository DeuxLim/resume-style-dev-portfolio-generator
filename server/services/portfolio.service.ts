import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getDb } from "../lib/db.js";
import {
	mapPortfolioRow,
	serializePortfolio,
	toPublicPortfolio,
} from "../lib/portfolio.js";
import { buildStarterPortfolio } from "../../shared/defaults/portfolio.js";
import type {
	EditablePortfolio,
	PortfolioVersionBase,
	PortfolioVersionDetail,
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

type PortfolioVersionRow = RowDataPacket & {
	id: number;
	user_id: number;
	name: string;
	is_active: number;
	snapshot_json: unknown;
	created_at?: Date;
	updated_at?: Date;
};

type PortfolioVersionSummaryRow = RowDataPacket & {
	id: number;
	user_id: number;
	name: string;
	is_active: number;
	created_at?: Date;
	updated_at?: Date;
};

type UserRow = RowDataPacket & {
	id: number;
	email: string;
	username: string;
	full_name: string;
};

let versionsTableReady: Promise<void> | null = null;
let portfoliosLayoutColumnReady: Promise<void> | null = null;
let portfoliosPublicSlugColumnReady: Promise<void> | null = null;
let portfoliosHeaderActionsColumnReady: Promise<void> | null = null;

const RESERVED_PUBLIC_SLUGS = new Set([
	"api",
	"dashboard",
	"login",
	"logout",
	"signup",
	"sample",
	"health",
	"assets",
	"uploads",
	"favicon.ico",
]);

export const normalizePublicSlug = (value: string) =>
	value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, "")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 40);

const isReservedPublicSlug = (slug: string) => RESERVED_PUBLIC_SLUGS.has(slug);

const ensurePortfoliosPublicSlugColumn = async () => {
	if (portfoliosPublicSlugColumnReady) {
		await portfoliosPublicSlugColumnReady;
		return;
	}

	const db = getDb();
	portfoliosPublicSlugColumnReady = (async () => {
		const [columnRows] = await db.query<RowDataPacket[]>(
			`
				SELECT COUNT(*) AS total
				FROM information_schema.COLUMNS
				WHERE TABLE_SCHEMA = DATABASE()
					AND TABLE_NAME = 'portfolios'
					AND COLUMN_NAME = 'public_slug'
			`,
		);
		const hasPublicSlugColumn = Number(columnRows[0]?.total ?? 0) > 0;

		if (!hasPublicSlugColumn) {
			await db.query(
				`
					ALTER TABLE portfolios
					ADD COLUMN public_slug VARCHAR(40) NULL AFTER user_id
				`,
			);
		}

		await db.query(
			`
				UPDATE portfolios p
				INNER JOIN users u ON u.id = p.user_id
				SET p.public_slug = u.username
				WHERE p.public_slug IS NULL OR TRIM(p.public_slug) = ''
			`,
		);

		const [indexRows] = await db.query<RowDataPacket[]>(
			`
				SELECT COUNT(*) AS total
				FROM information_schema.STATISTICS
				WHERE TABLE_SCHEMA = DATABASE()
					AND TABLE_NAME = 'portfolios'
					AND INDEX_NAME = 'uniq_portfolios_public_slug'
			`,
		);
		const hasUniqueIndex = Number(indexRows[0]?.total ?? 0) > 0;
		if (!hasUniqueIndex) {
			await db.query(
				`
					ALTER TABLE portfolios
					ADD UNIQUE INDEX uniq_portfolios_public_slug (public_slug)
				`,
			);
		}
	})();

	await portfoliosPublicSlugColumnReady;
};

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

const ensurePortfoliosHeaderActionsColumn = async () => {
	if (portfoliosHeaderActionsColumnReady) {
		await portfoliosHeaderActionsColumnReady;
		return;
	}

	const db = getDb();
	portfoliosHeaderActionsColumnReady = (async () => {
		const [rows] = await db.query<RowDataPacket[]>(
			`
				SELECT COUNT(*) AS total
				FROM information_schema.COLUMNS
				WHERE TABLE_SCHEMA = DATABASE()
					AND TABLE_NAME = 'portfolios'
					AND COLUMN_NAME = 'header_actions_json'
			`,
		);
		const exists = Number(rows[0]?.total ?? 0) > 0;
		if (exists) return;
		await db.query(
			`
				ALTER TABLE portfolios
				ADD COLUMN header_actions_json JSON NULL AFTER linkedin_url
			`,
		);
	})();

	await portfoliosHeaderActionsColumnReady;
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
	row: PortfolioVersionSummaryRow,
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

const parseSnapshotJson = (
	snapshotJson: unknown,
): Partial<EditablePortfolio> => {
	if (!snapshotJson) return {};

	if (typeof snapshotJson === "string") {
		try {
			return JSON.parse(snapshotJson) as Partial<EditablePortfolio>;
		} catch {
			return {};
		}
	}

	if (typeof snapshotJson === "object") {
		return snapshotJson as Partial<EditablePortfolio>;
	}

	return {};
};

const parseVersionSnapshot = (
	version: PortfolioVersionRow,
): Partial<EditablePortfolio> => parseSnapshotJson(version.snapshot_json);

const normalizeForComparison = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map((entry) => normalizeForComparison(entry));
	}

	if (value && typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>).sort(
			([leftKey], [rightKey]) => leftKey.localeCompare(rightKey),
		);
		return Object.fromEntries(
			entries.map(([key, entry]) => [key, normalizeForComparison(entry)]),
		);
	}

	return value;
};

const snapshotsEqual = (
	left: Partial<EditablePortfolio>,
	right: Partial<EditablePortfolio>,
) =>
	JSON.stringify(normalizeForComparison(left)) ===
	JSON.stringify(normalizeForComparison(right));

const mergeSnapshotWithLive = (
	livePortfolio: EditablePortfolio,
	snapshot: Partial<EditablePortfolio>,
): EditablePortfolio => ({
	...livePortfolio,
	...snapshot,
	username: livePortfolio.username,
	email: livePortfolio.email,
	hasCustomGeminiKey: Boolean(
		String(snapshot.geminiApiKey ?? livePortfolio.geminiApiKey ?? "").trim(),
	),
});

const getVersionByUserId = async (
	userId: number,
	versionId: number,
): Promise<PortfolioVersionRow | null> => {
	await ensurePortfolioVersionsTable();
	await ensurePortfoliosPublicSlugColumn();
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
	return rows[0] ?? null;
};

const getLatestVersionByUserId = async (
	userId: number,
): Promise<PortfolioVersionRow | null> => {
	await ensurePortfolioVersionsTable();
	await ensurePortfoliosPublicSlugColumn();
	const db = getDb();
	const [rows] = await db.query<PortfolioVersionRow[]>(
		`
			SELECT id, user_id, name, is_active, snapshot_json, created_at, updated_at
			FROM portfolio_versions
			WHERE user_id = ?
			ORDER BY updated_at DESC, id DESC
			LIMIT 1
		`,
		[userId],
	);
	return rows[0] ?? null;
};

const getAllVersionsByUserId = async (
	userId: number,
): Promise<PortfolioVersionRow[]> => {
	await ensurePortfolioVersionsTable();
	await ensurePortfoliosPublicSlugColumn();
	const db = getDb();
	const [rows] = await db.query<PortfolioVersionRow[]>(
		`
			SELECT id, user_id, name, is_active, snapshot_json, created_at, updated_at
			FROM portfolio_versions
			WHERE user_id = ?
		`,
		[userId],
	);
	return rows;
};

const resolveVersionBasePortfolioByUserId = async (
	userId: number,
	base: PortfolioVersionBase,
): Promise<EditablePortfolio | null> => {
	await ensurePortfoliosPublicSlugColumn();
	const livePortfolio = await getEditablePortfolioByUserId(userId);
	if (!livePortfolio) return null;

	if (base === "live") {
		return livePortfolio;
	}

	if (base === "latest") {
		const latestVersion = await getLatestVersionByUserId(userId);
		if (!latestVersion) return livePortfolio;
		const latestSnapshot = parseVersionSnapshot(latestVersion);
		return mergeSnapshotWithLive(livePortfolio, latestSnapshot);
	}

	const user = await getUserById(userId);
	if (!user) return livePortfolio;
	return buildBlankPortfolio(user);
};

const getUserById = async (userId: number): Promise<UserRow | null> => {
	await ensurePortfoliosPublicSlugColumn();
	const db = getDb();
	const [rows] = await db.query<UserRow[]>(
		`
			SELECT id, email, username, full_name
			FROM users
			WHERE id = ?
			LIMIT 1
		`,
		[userId],
	);
	return rows[0] ?? null;
};

const buildBlankPortfolio = (user: UserRow): EditablePortfolio => {
	const starter = buildStarterPortfolio(user.username, user.email);
	return {
		username: user.username,
		fullName: "",
		headline: "",
		location: "",
		experienceSummary: "",
		education: "",
		availability: "",
		email: user.email,
		phone: "",
		avatarUrl: "/default-avatar.svg",
		coverUrl: "/default-cover.svg",
		githubUrl: "",
		githubUsername: "",
		linkedinUrl: "",
		headerActions: starter.headerActions,
		about: [],
		timeline: [],
		experiences: [],
		techCategories: [],
		projects: [],
		customSections: [],
		layout: {
			sectionOrder: [...starter.layout.sectionOrder],
			sectionSpans: { ...starter.layout.sectionSpans },
			sectionHeights: { ...starter.layout.sectionHeights },
		},
		chatEnabled: true,
		geminiApiKey: "",
		hasCustomGeminiKey: false,
	};
};

const getNextAutoVersionName = async (userId: number) => {
	await ensurePortfoliosPublicSlugColumn();
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
	await ensurePortfoliosPublicSlugColumn();
	await ensurePortfoliosHeaderActionsColumn();
	const db = getDb();
	const [rows] = await db.query<PortfolioQueryRow[]>(
		`
			SELECT
				u.id AS user_id,
				u.email,
				COALESCE(NULLIF(p.public_slug, ''), u.username) AS username,
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
				p.header_actions_json,
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
			WHERE LOWER(COALESCE(NULLIF(p.public_slug, ''), u.username)) = ?
			LIMIT 1
		`,
		[username.trim().toLowerCase()],
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
	await ensurePortfoliosPublicSlugColumn();
	await ensurePortfoliosHeaderActionsColumn();
	const db = getDb();
	const [rows] = await db.query<PortfolioQueryRow[]>(
		`
			SELECT
				u.id AS user_id,
				u.email,
				COALESCE(NULLIF(p.public_slug, ''), u.username) AS username,
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
				p.header_actions_json,
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
	await ensurePortfoliosPublicSlugColumn();
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
	await ensurePortfoliosPublicSlugColumn();
	await ensurePortfoliosHeaderActionsColumn();
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
				header_actions_json = ?,
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
			serialized.headerActionsJson,
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
	await ensurePortfoliosPublicSlugColumn();
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
	await ensurePortfoliosPublicSlugColumn();
	const db = getDb();
	const [rows] = await db.query<PortfolioVersionSummaryRow[]>(
		`
			SELECT id, user_id, name, is_active, created_at, updated_at
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
	input?: {
		name?: string;
		base?: PortfolioVersionBase;
		portfolio?: EditablePortfolio;
	},
): Promise<PortfolioVersionSummary | "duplicate_snapshot" | null> => {
	const base = input?.base ?? "latest";
	const sourcePortfolio =
		input?.portfolio ?? (await resolveVersionBasePortfolioByUserId(userId, base));
	if (!sourcePortfolio) return null;
	const livePortfolio = await getEditablePortfolioByUserId(userId);
	if (!livePortfolio) return null;

	const existingVersions = await getAllVersionsByUserId(userId);
	for (const existingVersion of existingVersions) {
		const existingSnapshot = parseVersionSnapshot(existingVersion);
		const existingPortfolio = mergeSnapshotWithLive(
			livePortfolio,
			existingSnapshot,
		);
		if (snapshotsEqual(sourcePortfolio, existingPortfolio)) {
			return "duplicate_snapshot";
		}
	}

	await insertVersionSnapshot(userId, sourcePortfolio, {
		...(input?.name ? { name: input.name } : {}),
		isActive: false,
	});

	const created = await getLatestVersionByUserId(userId);
	return created ? toVersionSummary(created) : null;
};

export const getPortfolioVersionBasePreviewByUserId = async (
	userId: number,
	base: PortfolioVersionBase,
): Promise<EditablePortfolio | null> =>
	resolveVersionBasePortfolioByUserId(userId, base);

export const activatePortfolioVersionByUserId = async (
	userId: number,
	versionId: number,
): Promise<EditablePortfolio | null> => {
	await ensurePortfolioVersionsTable();
	await ensurePortfoliosPublicSlugColumn();
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

	const snapshot = parseSnapshotJson(version.snapshot_json);

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
	await ensurePortfoliosPublicSlugColumn();
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

export const renamePortfolioVersionByUserId = async (
	userId: number,
	versionId: number,
	name: string,
): Promise<PortfolioVersionSummary | "not_found" | "invalid_name"> => {
	await ensurePortfolioVersionsTable();
	await ensurePortfoliosPublicSlugColumn();
	const db = getDb();
	const nextName = sanitizeVersionName(name);

	if (!nextName) {
		return "invalid_name";
	}

	const [result] = await db.query<ResultSetHeader>(
		`
			UPDATE portfolio_versions
			SET name = ?, updated_at = CURRENT_TIMESTAMP
			WHERE id = ? AND user_id = ?
			LIMIT 1
		`,
		[nextName, versionId, userId],
	);

	if (Number(result.affectedRows ?? 0) <= 0) {
		return "not_found";
	}

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

	return version ? toVersionSummary(version) : "not_found";
};

export const getPortfolioVersionDetailByUserId = async (
	userId: number,
	versionId: number,
): Promise<PortfolioVersionDetail | null> => {
	const version = await getVersionByUserId(userId, versionId);
	if (!version) return null;
	const livePortfolio = await getEditablePortfolioByUserId(userId);
	if (!livePortfolio) return null;

	const snapshot = parseVersionSnapshot(version);
	const portfolio: EditablePortfolio = {
		...livePortfolio,
		...snapshot,
		username: livePortfolio.username,
		email: livePortfolio.email,
		hasCustomGeminiKey: Boolean(
			String(snapshot.geminiApiKey ?? livePortfolio.geminiApiKey ?? "").trim(),
		),
	};

	return {
		version: toVersionSummary(version),
		portfolio,
	};
};

export const updatePortfolioVersionSnapshotByUserId = async (
	userId: number,
	versionId: number,
	portfolio: EditablePortfolio,
): Promise<PortfolioVersionDetail | "not_found" | "active_version"> => {
	await ensurePortfolioVersionsTable();
	await ensurePortfoliosPublicSlugColumn();
	const version = await getVersionByUserId(userId, versionId);
	if (!version) return "not_found";
	if (Boolean(version.is_active)) return "active_version";

	const db = getDb();
	await db.query(
		`
			UPDATE portfolio_versions
			SET snapshot_json = ?, updated_at = CURRENT_TIMESTAMP
			WHERE id = ? AND user_id = ?
			LIMIT 1
		`,
		[JSON.stringify(portfolio), versionId, userId],
	);

	const detail = await getPortfolioVersionDetailByUserId(userId, versionId);
	return detail ?? "not_found";
};

export const createStarterPortfolio = async (user: SessionUser) => {
	await ensurePortfoliosLayoutColumn();
	await ensurePortfoliosPublicSlugColumn();
	await ensurePortfoliosHeaderActionsColumn();
	const db = getDb();
	const starter = buildStarterPortfolio(user.username, user.email, user.fullName);
	const serialized = serializePortfolio(starter);

	await db.query(
		`
			INSERT INTO portfolios (
				user_id,
				public_slug,
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
				header_actions_json,
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
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
		[
			user.id,
			user.username,
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
			serialized.headerActionsJson,
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
	await ensurePortfoliosPublicSlugColumn();
	await applyPortfolioUpdateByUserId(userId, portfolio);
	await syncActiveVersionByUserId(userId, portfolio);

	return getEditablePortfolioByUserId(userId);
};

export const updatePortfolioAvatarByUserId = async (
	userId: number,
	avatarUrl: string,
) => {
	await ensurePortfoliosPublicSlugColumn();
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
	await ensurePortfoliosPublicSlugColumn();
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

export const updatePortfolioPublicSlugByUserId = async (
	userId: number,
	input: string,
): Promise<
	EditablePortfolio | "not_found" | "invalid_slug" | "reserved_slug" | "slug_taken"
> => {
	await ensurePortfoliosPublicSlugColumn();
	const slug = normalizePublicSlug(input);

	if (!slug || slug.length < 3) {
		return "invalid_slug";
	}

	if (isReservedPublicSlug(slug)) {
		return "reserved_slug";
	}

	const current = await getEditablePortfolioByUserId(userId);
	if (!current) {
		return "not_found";
	}

	if (current.username === slug) {
		return current;
	}

	const db = getDb();
	try {
		await db.query(
			`
				UPDATE portfolios
				SET public_slug = ?, updated_at = CURRENT_TIMESTAMP
				WHERE user_id = ?
				LIMIT 1
			`,
			[slug, userId],
		);
	} catch (error) {
		const code = (error as { code?: string }).code;
		if (code === "ER_DUP_ENTRY") {
			return "slug_taken";
		}
		throw error;
	}

	const updated = await getEditablePortfolioByUserId(userId);
	return updated ?? "not_found";
};
