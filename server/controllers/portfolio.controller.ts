import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { buildStarterPortfolio } from "../../shared/defaults/portfolio.js";
import type { EditablePortfolio } from "../../shared/types/portfolio.types.js";
import {
	getEditablePortfolioByUserId,
	getPortfolioByUsername,
	updatePortfolioByUserId,
} from "../services/portfolio.service.js";

const normalizeArray = (value: unknown) =>
	Array.isArray(value) ? value : [];

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

const PortfolioController = {
	getPublicPortfolio,
	getMyPortfolio,
	updateMyPortfolio,
};

export default PortfolioController;
