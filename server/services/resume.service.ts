import type { RowDataPacket } from "mysql2";
import { getDb } from "../lib/db.js";
import { buildStarterResume } from "../../shared/defaults/resume.js";
import {
	createStarterResumeFromPortfolio,
	mapResumeRow,
	mapResumeToPortfolio,
	renderResumePdf,
	serializeResume,
	validateResume,
} from "../lib/resume.js";
import type { ResumeRecord } from "../../shared/types/resume.types.js";
import { getEditablePortfolioByUserId, getPortfolioByUsername, updatePortfolioByUserId } from "./portfolio.service.js";

type ResumeQueryRow = RowDataPacket & {
	user_id: number;
	template_key: string;
	content_json: string | null;
	layout_json: string | null;
	created_at?: Date;
	updated_at?: Date;
};

type UserLookupRow = RowDataPacket & {
	id: number;
	email: string;
	username: string;
	full_name: string;
};

let resumesTableReady: Promise<void> | null = null;

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

const insertResume = async (userId: number, resume: ResumeRecord) => {
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

export const getOrCreateResumeByUserId = async (
	userId: number,
): Promise<ResumeRecord | null> => {
	const existing = await getResumeRowByUserId(userId);
	if (existing) {
		const portfolio = await getEditablePortfolioByUserId(userId);
		if (!portfolio) return null;
		const fallback = createStarterResumeFromPortfolio(portfolio);
		return mapResumeRow(existing, fallback);
	}

	const portfolio = await getEditablePortfolioByUserId(userId);
	if (!portfolio) {
		return null;
	}
	const starter = createStarterResumeFromPortfolio(portfolio);
	await insertResume(userId, starter);
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

	return getOrCreateResumeByUserId(userId);
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
			SELECT id, email, username, full_name
			FROM users
			WHERE LOWER(username) = ?
			LIMIT 1
		`,
		[normalizedUsername],
	);
	const user = users[0];
	if (!user) {
		return null;
	}

	const portfolio = await getPortfolioByUsername(user.username);
	const [rows] = await db.query<ResumeQueryRow[]>(
		`
			SELECT r.user_id, r.template_key, r.content_json, r.layout_json, r.created_at, r.updated_at
			FROM resumes r
			INNER JOIN users u ON u.id = r.user_id
			WHERE u.username = ?
			LIMIT 1
		`,
		[user.username],
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

export const getResumeValidationByUserId = async (userId: number) => {
	const resume = await getOrCreateResumeByUserId(userId);
	if (!resume) {
		return null;
	}
	return validateResume(resume);
};
