import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getDb } from "../lib/db.js";
import { buildStarterResume, defaultResumeLayout } from "../../shared/defaults/resume.js";
import { normalizeResumeContent, normalizeResumeLayout } from "../../shared/lib/resume.js";
import {
	createStarterResumeFromPortfolio,
	mapResumeRow,
	mapResumeToPortfolio,
	renderResumePdf,
	serializeResume,
	validateResume,
} from "../lib/resume.js";
import type {
	ResumeRecord,
	ResumeTemplateKey,
	ResumeVersionBase,
	ResumeVersionDetail,
	ResumeVersionSummary,
} from "../../shared/types/resume.types.js";
import {
	getEditablePortfolioByUserId,
	getPortfolioByUsername,
	updatePortfolioByUserId,
} from "./portfolio.service.js";

type ResumeQueryRow = RowDataPacket & {
	user_id: number;
	template_key: string;
	content_json: string | null;
	layout_json: string | null;
	created_at?: Date;
	updated_at?: Date;
};

type ResumeVersionRow = RowDataPacket & {
	id: number;
	user_id: number;
	name: string;
	is_active: number;
	snapshot_json: unknown;
	created_at?: Date;
	updated_at?: Date;
};

type UserLookupRow = RowDataPacket & {
	id: number;
	email: string;
	username: string;
	full_name: string;
	portfolio_slug?: string;
};

let resumesTableReady: Promise<void> | null = null;
let resumeVersionsTableReady: Promise<void> | null = null;

const buildVersionName = (count: number) => `Version ${count + 1}`;

const sanitizeVersionName = (name: string) => {
	const value = name.trim();
	return value ? value.slice(0, 120) : "";
};

const isResumeTemplateKey = (value: unknown): value is ResumeTemplateKey =>
	value === "ats_classic_v1" ||
	value === "harvard_classic_v1" ||
	value === "deux_modern_v1";

const toSnapshotResume = (resume: ResumeRecord): ResumeRecord => ({
	templateKey: isResumeTemplateKey(resume.templateKey)
		? resume.templateKey
		: "ats_classic_v1",
	content: normalizeResumeContent(resume.content),
	layout: normalizeResumeLayout(resume.layout),
});

const parseSnapshotJson = (snapshotJson: unknown): Partial<ResumeRecord> => {
	if (!snapshotJson) return {};

	if (typeof snapshotJson === "string") {
		try {
			return JSON.parse(snapshotJson) as Partial<ResumeRecord>;
		} catch {
			return {};
		}
	}

	if (typeof snapshotJson === "object") {
		return snapshotJson as Partial<ResumeRecord>;
	}

	return {};
};

const parseVersionSnapshot = (
	version: ResumeVersionRow,
): Partial<ResumeRecord> => parseSnapshotJson(version.snapshot_json);

const mergeSnapshotWithLive = (
	liveResume: ResumeRecord,
	snapshot: Partial<ResumeRecord>,
): ResumeRecord => {
	const merged: ResumeRecord = {
		templateKey: isResumeTemplateKey(snapshot.templateKey)
			? snapshot.templateKey
			: liveResume.templateKey,
		content: normalizeResumeContent(
			(snapshot.content as ResumeRecord["content"]) ?? liveResume.content,
		),
		layout: normalizeResumeLayout(
			(snapshot.layout as ResumeRecord["layout"]) ?? liveResume.layout,
		),
	};

	if (liveResume.createdAt) {
		merged.createdAt = liveResume.createdAt;
	}

	if (liveResume.updatedAt) {
		merged.updatedAt = liveResume.updatedAt;
	}

	return merged;
};

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

const snapshotsEqual = (left: ResumeRecord, right: ResumeRecord) =>
	JSON.stringify(normalizeForComparison(toSnapshotResume(left))) ===
	JSON.stringify(normalizeForComparison(toSnapshotResume(right)));

const toVersionSummary = (row: ResumeVersionRow): ResumeVersionSummary => {
	const summary: ResumeVersionSummary = {
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

const ensureResumesTable = async () => {
	if (resumesTableReady) {
		await resumesTableReady;
		return;
	}

	const db = getDb();
	resumesTableReady = db
		.query(
			`
				CREATE TABLE IF NOT EXISTS resumes (
					id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
					user_id INT UNSIGNED NOT NULL UNIQUE,
					template_key VARCHAR(60) NOT NULL DEFAULT 'ats_classic_v1',
					content_json JSON NOT NULL,
					layout_json JSON NOT NULL,
					created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
					CONSTRAINT fk_resumes_user
						FOREIGN KEY (user_id) REFERENCES users(id)
						ON DELETE CASCADE
				)
			`,
		)
		.then(() => undefined);

	await resumesTableReady;
};

const ensureResumeVersionsTable = async () => {
	if (resumeVersionsTableReady) {
		await resumeVersionsTableReady;
		return;
	}

	const db = getDb();
	resumeVersionsTableReady = db
		.query(
			`
				CREATE TABLE IF NOT EXISTS resume_versions (
					id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
					user_id INT UNSIGNED NOT NULL,
					name VARCHAR(120) NOT NULL,
					is_active TINYINT(1) NOT NULL DEFAULT 0,
					snapshot_json JSON NOT NULL,
					created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
					INDEX idx_resume_versions_user (user_id),
					CONSTRAINT fk_resume_versions_user
						FOREIGN KEY (user_id) REFERENCES users(id)
						ON DELETE CASCADE
				)
			`,
		)
		.then(() => undefined);

	await resumeVersionsTableReady;
};

const getResumeRowByUserId = async (userId: number) => {
	await ensureResumesTable();
	const db = getDb();
	const [rows] = await db.query<ResumeQueryRow[]>(
		`
			SELECT user_id, template_key, content_json, layout_json, created_at, updated_at
			FROM resumes
			WHERE user_id = ?
			LIMIT 1
		`,
		[userId],
	);
	return rows[0] ?? null;
};

const getVersionByUserId = async (
	userId: number,
	versionId: number,
): Promise<ResumeVersionRow | null> => {
	await ensureResumeVersionsTable();
	const db = getDb();
	const [rows] = await db.query<ResumeVersionRow[]>(
		`
			SELECT id, user_id, name, is_active, snapshot_json, created_at, updated_at
			FROM resume_versions
			WHERE id = ? AND user_id = ?
			LIMIT 1
		`,
		[versionId, userId],
	);
	return rows[0] ?? null;
};

const getLatestVersionByUserId = async (
	userId: number,
): Promise<ResumeVersionRow | null> => {
	await ensureResumeVersionsTable();
	const db = getDb();
	const [rows] = await db.query<ResumeVersionRow[]>(
		`
			SELECT id, user_id, name, is_active, snapshot_json, created_at, updated_at
			FROM resume_versions
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
): Promise<ResumeVersionRow[]> => {
	await ensureResumeVersionsTable();
	const db = getDb();
	const [rows] = await db.query<ResumeVersionRow[]>(
		`
			SELECT id, user_id, name, is_active, snapshot_json, created_at, updated_at
			FROM resume_versions
			WHERE user_id = ?
		`,
		[userId],
	);
	return rows;
};

const getNextAutoVersionName = async (userId: number) => {
	await ensureResumeVersionsTable();
	const db = getDb();
	const [rows] = await db.query<RowDataPacket[]>(
		"SELECT name FROM resume_versions WHERE user_id = ?",
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

const insertResume = async (userId: number, resume: ResumeRecord) => {
	await ensureResumesTable();
	const db = getDb();
	const serialized = serializeResume(resume);
	await db.query(
		`
			INSERT INTO resumes (user_id, template_key, content_json, layout_json)
			VALUES (?, ?, ?, ?)
		`,
		[userId, serialized.templateKey, serialized.contentJson, serialized.layoutJson],
	);
};

const insertResumeVersionSnapshot = async (
	userId: number,
	resume: ResumeRecord,
	options?: { name?: string; isActive?: boolean },
) => {
	await ensureResumeVersionsTable();
	const db = getDb();
	const providedName = sanitizeVersionName(options?.name ?? "");
	const name = providedName || (await getNextAutoVersionName(userId));
	const snapshotJson = JSON.stringify(toSnapshotResume(resume));
	const isActive = options?.isActive ? 1 : 0;

	if (isActive) {
		await db.query(
			"UPDATE resume_versions SET is_active = 0 WHERE user_id = ?",
			[userId],
		);
	}

	await db.query(
		`
			INSERT INTO resume_versions (user_id, name, is_active, snapshot_json)
			VALUES (?, ?, ?, ?)
		`,
		[userId, name, isActive, snapshotJson],
	);
};

const ensureInitialResumeVersionByUserId = async (
	userId: number,
	resume: ResumeRecord,
) => {
	await ensureResumeVersionsTable();
	const db = getDb();
	const [rows] = await db.query<RowDataPacket[]>(
		"SELECT COUNT(*) AS total FROM resume_versions WHERE user_id = ?",
		[userId],
	);
	const total = Number(rows[0]?.total ?? 0);
	if (total > 0) return;
	await insertResumeVersionSnapshot(userId, resume, {
		name: "Version 1",
		isActive: true,
	});
};

const syncActiveResumeVersionByUserId = async (
	userId: number,
	resume: ResumeRecord,
) => {
	await ensureResumeVersionsTable();
	const db = getDb();
	const snapshotJson = JSON.stringify(toSnapshotResume(resume));
	const [activeRows] = await db.query<ResumeVersionRow[]>(
		`
			SELECT id
			FROM resume_versions
			WHERE user_id = ? AND is_active = 1
			ORDER BY updated_at DESC
			LIMIT 1
		`,
		[userId],
	);

	const activeRow = activeRows[0];
	if (!activeRow) {
		await insertResumeVersionSnapshot(userId, resume, { isActive: true });
		return;
	}

	await db.query(
		`
			UPDATE resume_versions
			SET snapshot_json = ?, updated_at = CURRENT_TIMESTAMP
			WHERE id = ? AND user_id = ?
		`,
		[snapshotJson, activeRow.id, userId],
	);
};

const getUserById = async (userId: number): Promise<UserLookupRow | null> => {
	const db = getDb();
	const [rows] = await db.query<UserLookupRow[]>(
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

const buildBlankResume = (user: UserLookupRow): ResumeRecord => {
	const starter = buildStarterResume({
		fullName: user.full_name,
		email: user.email,
	});
	return {
		templateKey: "ats_classic_v1",
		content: normalizeResumeContent({
			...starter.content,
			header: {
				...starter.content.header,
				fullName: "",
				headline: "",
				location: "",
				email: user.email,
				phone: "",
				websiteUrl: "",
				linkedinUrl: "",
				githubUrl: "",
				photoDataUrl: "",
			},
			summary: "",
			experience: [],
			education: [],
			skills: [],
			projects: [],
			certifications: [],
			awards: [],
			volunteer: [],
			languages: [],
			publications: [],
			custom: [],
		}),
		layout: normalizeResumeLayout({
			...defaultResumeLayout,
			sectionOrder: [...defaultResumeLayout.sectionOrder],
			visibility: { ...defaultResumeLayout.visibility },
			positions: {},
		}),
	};
};

const resolveVersionBaseResumeByUserId = async (
	userId: number,
	base: ResumeVersionBase,
): Promise<ResumeRecord | null> => {
	const liveResume = await getOrCreateResumeByUserId(userId);
	if (!liveResume) return null;

	if (base === "live") {
		return liveResume;
	}

	if (base === "latest") {
		const latestVersion = await getLatestVersionByUserId(userId);
		if (!latestVersion) return liveResume;
		const latestSnapshot = parseVersionSnapshot(latestVersion);
		return mergeSnapshotWithLive(liveResume, latestSnapshot);
	}

	const user = await getUserById(userId);
	if (!user) return liveResume;
	return buildBlankResume(user);
};

export const getOrCreateResumeByUserId = async (
	userId: number,
): Promise<ResumeRecord | null> => {
	const existing = await getResumeRowByUserId(userId);
	if (existing) {
		const portfolio = await getEditablePortfolioByUserId(userId);
		if (!portfolio) return null;
		const fallback = createStarterResumeFromPortfolio(portfolio);
		const resume = mapResumeRow(existing, fallback);
		await ensureInitialResumeVersionByUserId(userId, resume);
		return resume;
	}

	const portfolio = await getEditablePortfolioByUserId(userId);
	if (!portfolio) {
		return null;
	}
	const starter = createStarterResumeFromPortfolio(portfolio);
	await insertResume(userId, starter);
	await ensureInitialResumeVersionByUserId(userId, starter);
	return starter;
};

export const updateResumeByUserId = async (
	userId: number,
	resume: ResumeRecord,
) => {
	await ensureResumesTable();
	const db = getDb();
	const serialized = serializeResume(resume);
	await db.query(
		`
			UPDATE resumes
			SET template_key = ?, content_json = ?, layout_json = ?, updated_at = CURRENT_TIMESTAMP
			WHERE user_id = ?
		`,
		[
			serialized.templateKey,
			serialized.contentJson,
			serialized.layoutJson,
			userId,
		],
	);

	const latest = await getOrCreateResumeByUserId(userId);
	if (!latest) return null;
	await syncActiveResumeVersionByUserId(userId, latest);
	return getOrCreateResumeByUserId(userId);
};

export const listResumeVersionsByUserId = async (
	userId: number,
): Promise<ResumeVersionSummary[]> => {
	const resume = await getOrCreateResumeByUserId(userId);
	if (!resume) return [];
	await ensureInitialResumeVersionByUserId(userId, resume);
	await ensureResumeVersionsTable();
	const db = getDb();
	const [rows] = await db.query<ResumeVersionRow[]>(
		`
			SELECT id, user_id, name, is_active, snapshot_json, created_at, updated_at
			FROM resume_versions
			WHERE user_id = ?
			ORDER BY is_active DESC, updated_at DESC, id DESC
		`,
		[userId],
	);

	return rows.map(toVersionSummary);
};

export const createResumeVersionByUserId = async (
	userId: number,
	input?: {
		name?: string;
		base?: ResumeVersionBase;
		resume?: ResumeRecord;
	},
): Promise<ResumeVersionSummary | "duplicate_snapshot" | null> => {
	const base = input?.base ?? "latest";
	const sourceResume =
		input?.resume ?? (await resolveVersionBaseResumeByUserId(userId, base));
	if (!sourceResume) return null;
	const liveResume = await getOrCreateResumeByUserId(userId);
	if (!liveResume) return null;

	const existingVersions = await getAllVersionsByUserId(userId);
	for (const existingVersion of existingVersions) {
		const existingSnapshot = parseVersionSnapshot(existingVersion);
		const existingResume = mergeSnapshotWithLive(liveResume, existingSnapshot);
		if (snapshotsEqual(sourceResume, existingResume)) {
			return "duplicate_snapshot";
		}
	}

	await insertResumeVersionSnapshot(userId, sourceResume, {
		...(input?.name ? { name: input.name } : {}),
		isActive: false,
	});

	const created = await getLatestVersionByUserId(userId);
	return created ? toVersionSummary(created) : null;
};

export const getResumeVersionBasePreviewByUserId = async (
	userId: number,
	base: ResumeVersionBase,
): Promise<ResumeRecord | null> => resolveVersionBaseResumeByUserId(userId, base);

export const getResumeVersionDetailByUserId = async (
	userId: number,
	versionId: number,
): Promise<ResumeVersionDetail | null> => {
	const version = await getVersionByUserId(userId, versionId);
	if (!version) return null;
	const liveResume = await getOrCreateResumeByUserId(userId);
	if (!liveResume) return null;

	const snapshot = parseVersionSnapshot(version);
	const resume = mergeSnapshotWithLive(liveResume, snapshot);

	return {
		version: toVersionSummary(version),
		resume,
	};
};

export const activateResumeVersionByUserId = async (
	userId: number,
	versionId: number,
): Promise<ResumeRecord | null> => {
	await ensureResumeVersionsTable();
	const version = await getVersionByUserId(userId, versionId);
	if (!version) {
		return null;
	}

	const current = await getOrCreateResumeByUserId(userId);
	if (!current) {
		return null;
	}

	const snapshot = parseVersionSnapshot(version);
	const nextResume = mergeSnapshotWithLive(current, snapshot);
	const serialized = serializeResume(nextResume);
	const db = getDb();

	await db.query(
		"UPDATE resume_versions SET is_active = 0 WHERE user_id = ?",
		[userId],
	);
	await db.query(
		`
			UPDATE resume_versions
			SET is_active = 1, updated_at = CURRENT_TIMESTAMP
			WHERE id = ? AND user_id = ?
		`,
		[versionId, userId],
	);
	await db.query(
		`
			UPDATE resumes
			SET template_key = ?, content_json = ?, layout_json = ?, updated_at = CURRENT_TIMESTAMP
			WHERE user_id = ?
		`,
		[
			serialized.templateKey,
			serialized.contentJson,
			serialized.layoutJson,
			userId,
		],
	);

	return getOrCreateResumeByUserId(userId);
};

export const deleteResumeVersionByUserId = async (
	userId: number,
	versionId: number,
): Promise<"deleted" | "not_found" | "active_version"> => {
	await ensureResumeVersionsTable();
	const version = await getVersionByUserId(userId, versionId);
	if (!version) return "not_found";
	if (version.is_active) return "active_version";

	const db = getDb();
	await db.query(
		`
			DELETE FROM resume_versions
			WHERE id = ? AND user_id = ?
			LIMIT 1
		`,
		[versionId, userId],
	);
	return "deleted";
};

export const renameResumeVersionByUserId = async (
	userId: number,
	versionId: number,
	name: string,
): Promise<ResumeVersionSummary | "not_found" | "invalid_name"> => {
	await ensureResumeVersionsTable();
	const nextName = sanitizeVersionName(name);
	if (!nextName) {
		return "invalid_name";
	}

	const db = getDb();
	const [result] = await db.query<ResultSetHeader>(
		`
			UPDATE resume_versions
			SET name = ?, updated_at = CURRENT_TIMESTAMP
			WHERE id = ? AND user_id = ?
			LIMIT 1
		`,
		[nextName, versionId, userId],
	);

	if (Number(result.affectedRows ?? 0) <= 0) {
		return "not_found";
	}

	const [rows] = await db.query<ResumeVersionRow[]>(
		`
			SELECT id, user_id, name, is_active, snapshot_json, created_at, updated_at
			FROM resume_versions
			WHERE id = ? AND user_id = ?
			LIMIT 1
		`,
		[versionId, userId],
	);
	const version = rows[0];

	return version ? toVersionSummary(version) : "not_found";
};

export const updateResumeVersionSnapshotByUserId = async (
	userId: number,
	versionId: number,
	resume: ResumeRecord,
): Promise<ResumeVersionDetail | "not_found" | "active_version"> => {
	await ensureResumeVersionsTable();
	const version = await getVersionByUserId(userId, versionId);
	if (!version) return "not_found";
	if (Boolean(version.is_active)) return "active_version";

	const db = getDb();
	await db.query(
		`
			UPDATE resume_versions
			SET snapshot_json = ?, updated_at = CURRENT_TIMESTAMP
			WHERE id = ? AND user_id = ?
			LIMIT 1
		`,
		[JSON.stringify(toSnapshotResume(resume)), versionId, userId],
	);

	const detail = await getResumeVersionDetailByUserId(userId, versionId);
	return detail ?? "not_found";
};

export const syncResumeToPortfolioByUserId = async (userId: number) => {
	const resume = await getOrCreateResumeByUserId(userId);
	const portfolio = await getEditablePortfolioByUserId(userId);
	if (!resume || !portfolio) return null;
	const merged = mapResumeToPortfolio(resume, portfolio);
	return updatePortfolioByUserId(userId, merged);
};

export const getResumePdfByUsername = async (username: string) => {
	await ensureResumesTable();
	const db = getDb();
	const normalizedUsername = username.trim().toLowerCase();
	const [users] = await db.query<UserLookupRow[]>(
		`
			SELECT
				u.id,
				u.email,
				u.username,
				u.full_name,
				COALESCE(NULLIF(p.public_slug, ''), u.username) AS portfolio_slug
			FROM users u
			INNER JOIN portfolios p ON p.user_id = u.id
			WHERE LOWER(COALESCE(NULLIF(p.public_slug, ''), u.username)) = ?
			LIMIT 1
		`,
		[normalizedUsername],
	);
	const user = users[0];
	if (!user) {
		return null;
	}

	const portfolio = await getPortfolioByUsername(normalizedUsername);
	const [rows] = await db.query<ResumeQueryRow[]>(
		`
			SELECT
				r.user_id,
				r.template_key,
				r.content_json,
				r.layout_json,
				r.created_at,
				r.updated_at
			FROM resumes r
			WHERE r.user_id = ?
			LIMIT 1
		`,
		[user.id],
	);

	const fallback = portfolio
		? createStarterResumeFromPortfolio(portfolio)
		: buildStarterResume({
				fullName: user.full_name,
				email: user.email,
			});
	const resume = rows[0] ? mapResumeRow(rows[0], fallback) : fallback;
	const validation = validateResume(resume);
	if (!validation.canExportPdf) {
		return { validation, doc: null, resume };
	}
	const doc = renderResumePdf(resume, validation);
	return { validation, doc, resume };
};

export const getResumePdfByUserId = async (userId: number) => {
	const resume = await getOrCreateResumeByUserId(userId);
	if (!resume) {
		return null;
	}
	const validation = validateResume(resume);
	if (!validation.canExportPdf) {
		return { validation, doc: null, resume };
	}
	const doc = renderResumePdf(resume, validation);
	return { validation, doc, resume };
};

export const getResumePdfByVersionId = async (
	userId: number,
	versionId: number,
) => {
	const detail = await getResumeVersionDetailByUserId(userId, versionId);
	if (!detail) {
		return null;
	}
	const validation = validateResume(detail.resume);
	if (!validation.canExportPdf) {
		return { validation, doc: null, resume: detail.resume };
	}
	const doc = renderResumePdf(detail.resume, validation);
	return { validation, doc, resume: detail.resume };
};

export const getResumePdfByRecord = async (resume: ResumeRecord) => {
	const validation = validateResume(resume);
	if (!validation.canExportPdf) {
		return { validation, doc: null, resume };
	}
	const doc = renderResumePdf(resume, validation);
	return { validation, doc, resume };
};

export const getResumeValidationByUserId = async (userId: number) => {
	const resume = await getOrCreateResumeByUserId(userId);
	if (!resume) {
		return null;
	}
	return validateResume(resume);
};
