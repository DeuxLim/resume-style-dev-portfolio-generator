import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
	buildStarterPortfolio,
	defaultPortfolioLayout,
} from "../../shared/defaults/portfolio.js";
import type {
	EditablePortfolio,
	PortfolioSectionKey,
	PortfolioSectionSpan,
} from "../../shared/types/portfolio.types.js";
import {
	getUploadsRoot,
	toPublicAvatarPath,
	toPublicCoverPath,
} from "../lib/uploads.js";
import {
	activatePortfolioVersionByUserId,
	createPortfolioVersionByUserId,
	deletePortfolioVersionByUserId,
	getEditablePortfolioByUserId,
	getPortfolioByUsername,
	listPortfolioVersionsByUserId,
	updatePortfolioAvatarByUserId,
	updatePortfolioCoverByUserId,
	updatePortfolioByUserId,
} from "../services/portfolio.service.js";

const normalizeArray = (value: unknown) =>
	Array.isArray(value) ? value : [];

const validSectionOrder = new Set<PortfolioSectionKey>(
	defaultPortfolioLayout.sectionOrder,
);

const normalizeSectionOrder = (value: unknown): PortfolioSectionKey[] => {
	const incoming = normalizeArray(value)
		.map((entry) => String(entry).trim() as PortfolioSectionKey)
		.filter((entry): entry is PortfolioSectionKey => validSectionOrder.has(entry));

	const deduped: PortfolioSectionKey[] = [];
	for (const section of incoming) {
		if (!deduped.includes(section)) {
			deduped.push(section);
		}
	}

	for (const section of defaultPortfolioLayout.sectionOrder) {
		if (!deduped.includes(section)) {
			deduped.push(section);
		}
	}

	return deduped;
};

const allowedSpans = new Set<PortfolioSectionSpan>([4, 6, 8, 12]);

const normalizeSectionSpans = (
	value: unknown,
): Partial<Record<PortfolioSectionKey, PortfolioSectionSpan>> => {
	const base = { ...defaultPortfolioLayout.sectionSpans };
	const input =
		value && typeof value === "object"
			? (value as Partial<Record<PortfolioSectionKey, unknown>>)
			: {};

	for (const sectionKey of defaultPortfolioLayout.sectionOrder) {
		const parsed = Number(input[sectionKey]);
		if (allowedSpans.has(parsed as PortfolioSectionSpan)) {
			base[sectionKey] = parsed as PortfolioSectionSpan;
		}
	}

	return base;
};

const sanitizeEditablePortfolio = (
	value: unknown,
	username: string,
	email: string,
	fullName: string,
): EditablePortfolio => {
	const fallback = buildStarterPortfolio(username, email, fullName);
	const input = (value ?? {}) as Partial<EditablePortfolio>;

	return {
		username,
		fullName: String(input.fullName ?? fallback.fullName),
		headline: String(input.headline ?? fallback.headline),
		location: String(input.location ?? fallback.location),
		experienceSummary: String(
			input.experienceSummary ?? fallback.experienceSummary,
		),
		education: String(input.education ?? fallback.education),
		availability: String(input.availability ?? fallback.availability),
		email,
		phone: String(input.phone ?? fallback.phone),
		avatarUrl: String(input.avatarUrl ?? fallback.avatarUrl),
		coverUrl: String(input.coverUrl ?? fallback.coverUrl),
		githubUrl: String(input.githubUrl ?? fallback.githubUrl),
		githubUsername: String(input.githubUsername ?? fallback.githubUsername),
		linkedinUrl: String(input.linkedinUrl ?? fallback.linkedinUrl),
		about: normalizeArray(input.about)
			.map((item) => String(item).trim())
			.filter(Boolean),
		timeline: normalizeArray(input.timeline).map((item) => ({
			id: String((item as { id?: string }).id ?? randomUUID()),
			year: String((item as { year?: string }).year ?? ""),
			position: String((item as { position?: string }).position ?? ""),
			company: String((item as { company?: string }).company ?? ""),
			note: String((item as { note?: string }).note ?? ""),
		})),
		experiences: normalizeArray(input.experiences).map((item) => ({
			id: String((item as { id?: string }).id ?? randomUUID()),
			role: String((item as { role?: string }).role ?? ""),
			company: String((item as { company?: string }).company ?? ""),
			period: String((item as { period?: string }).period ?? ""),
			highlights: normalizeArray(
				(item as { highlights?: string[] }).highlights,
			)
				.map((entry) => String(entry).trim())
				.filter(Boolean),
		})),
		techCategories: normalizeArray(input.techCategories).map((item) => ({
			id: String((item as { id?: string }).id ?? randomUUID()),
			name: String((item as { name?: string }).name ?? ""),
			items: normalizeArray((item as { items?: string[] }).items)
				.map((entry) => String(entry).trim())
				.filter(Boolean),
		})),
		projects: normalizeArray(input.projects).map((item) => ({
			id: String((item as { id?: string }).id ?? randomUUID()),
			name: String((item as { name?: string }).name ?? ""),
			description: String(
				(item as { description?: string }).description ?? "",
			),
			url: String((item as { url?: string }).url ?? ""),
		})),
		customSections: normalizeArray(input.customSections).map((item) => ({
			id: String((item as { id?: string }).id ?? randomUUID()),
			title: String((item as { title?: string }).title ?? ""),
			body: String((item as { body?: string }).body ?? ""),
		})),
		layout: {
			sectionOrder: normalizeSectionOrder(input.layout?.sectionOrder),
			sectionSpans: normalizeSectionSpans(input.layout?.sectionSpans),
		},
		chatEnabled: Boolean(input.chatEnabled),
		geminiApiKey: String(input.geminiApiKey ?? ""),
		hasCustomGeminiKey: Boolean(String(input.geminiApiKey ?? "").trim()),
	};
};

const getPublicPortfolio = async (req: Request, res: Response) => {
	const username = String(req.params.username ?? "").trim().toLowerCase();
	const portfolio = await getPortfolioByUsername(username);

	if (!portfolio) {
		res.status(404).json({ message: "Portfolio not found." });
		return;
	}

	res.json({ portfolio });
};

const getMyPortfolio = async (req: Request, res: Response) => {
	const portfolio = await getEditablePortfolioByUserId(req.auth!.userId);

	if (!portfolio) {
		res.status(404).json({ message: "Portfolio not found." });
		return;
	}

	res.json({ portfolio });
};

const updateMyPortfolio = async (req: Request, res: Response) => {
	const payload = sanitizeEditablePortfolio(
		req.body.portfolio,
		req.auth!.username,
		req.auth!.email,
		req.auth!.fullName,
	);

	const portfolio = await updatePortfolioByUserId(req.auth!.userId, payload);
	res.json({ portfolio });
};

const uploadMyAvatar = async (req: Request, res: Response) => {
	if (!req.file) {
		res.status(400).json({ message: "Avatar file is required." });
		return;
	}

	const avatarPath = toPublicAvatarPath(req.file.filename);
	const updated = await updatePortfolioAvatarByUserId(
		req.auth!.userId,
		avatarPath,
	);

	if (!updated) {
		res.status(404).json({ message: "Portfolio not found." });
		return;
	}

	const previousAvatar = (req.body?.previousAvatarUrl ?? "").trim();
	const normalizedUploadPath = avatarPath.replace(/^\//, "");
	const normalizedPreviousPath = previousAvatar.replace(/^\//, "");
	const shouldDeletePrevious =
		normalizedPreviousPath.startsWith("uploads/avatars/") &&
		normalizedPreviousPath !== normalizedUploadPath;

	if (shouldDeletePrevious) {
		try {
			await fs.unlink(path.join(getUploadsRoot(), normalizedPreviousPath.replace(/^uploads\//, "")));
		} catch {
			// Best-effort cleanup only.
		}
	}

	res.status(201).json({ avatarUrl: updated.avatarUrl, portfolio: updated });
};

const uploadMyCover = async (req: Request, res: Response) => {
	if (!req.file) {
		res.status(400).json({ message: "Cover file is required." });
		return;
	}

	const coverPath = toPublicCoverPath(req.file.filename);
	const updated = await updatePortfolioCoverByUserId(req.auth!.userId, coverPath);

	if (!updated) {
		res.status(404).json({ message: "Portfolio not found." });
		return;
	}

	const previousCover = (req.body?.previousCoverUrl ?? "").trim();
	const normalizedUploadPath = coverPath.replace(/^\//, "");
	const normalizedPreviousPath = previousCover.replace(/^\//, "");
	const shouldDeletePrevious =
		normalizedPreviousPath.startsWith("uploads/covers/") &&
		normalizedPreviousPath !== normalizedUploadPath;

	if (shouldDeletePrevious) {
		try {
			await fs.unlink(
				path.join(
					getUploadsRoot(),
					normalizedPreviousPath.replace(/^uploads\//, ""),
				),
			);
		} catch {
			// Best-effort cleanup only.
		}
	}

	res.status(201).json({ coverUrl: updated.coverUrl, portfolio: updated });
};

const listMyPortfolioVersions = async (req: Request, res: Response) => {
	const versions = await listPortfolioVersionsByUserId(req.auth!.userId);
	res.json({ versions });
};

const createMyPortfolioVersion = async (req: Request, res: Response) => {
	const name = String(req.body?.name ?? "");
	const versions = await createPortfolioVersionByUserId(req.auth!.userId, {
		name,
	});
	res.status(201).json({ versions });
};

const activateMyPortfolioVersion = async (req: Request, res: Response) => {
	const versionId = Number(req.params.versionId);

	if (!Number.isFinite(versionId) || versionId <= 0) {
		res.status(400).json({ message: "Invalid version id." });
		return;
	}

	const portfolio = await activatePortfolioVersionByUserId(
		req.auth!.userId,
		versionId,
	);

	if (!portfolio) {
		res.status(404).json({ message: "Version not found." });
		return;
	}

	res.json({ portfolio });
};

const deleteMyPortfolioVersion = async (req: Request, res: Response) => {
	const versionId = Number(req.params.versionId);

	if (!Number.isFinite(versionId) || versionId <= 0) {
		res.status(400).json({ message: "Invalid version id." });
		return;
	}

	const result = await deletePortfolioVersionByUserId(
		req.auth!.userId,
		versionId,
	);

	if (result === "not_found") {
		res.status(404).json({ message: "Version not found." });
		return;
	}

	if (result === "active_version") {
		res.status(409).json({
			message: "Active version cannot be deleted. Set another version live first.",
		});
		return;
	}

	res.status(204).send();
};

const PortfolioController = {
	getPublicPortfolio,
	getMyPortfolio,
	updateMyPortfolio,
	uploadMyAvatar,
	uploadMyCover,
	listMyPortfolioVersions,
	createMyPortfolioVersion,
	activateMyPortfolioVersion,
	deleteMyPortfolioVersion,
};

export default PortfolioController;
