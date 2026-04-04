import type { Request, Response } from "express";
import { defaultResumeLayout } from "../../shared/defaults/resume.js";
import { normalizeResumeContent, normalizeResumeLayout, validateResume } from "../../shared/lib/resume.js";
import type { ResumeRecord, ResumeTemplateKey } from "../../shared/types/resume.types.js";
import {
	getOrCreateResumeByUserId,
	getResumePdfByUserId,
	getResumePdfByUsername,
	syncResumeToPortfolioByUserId,
	updateResumeByUserId,
} from "../services/resume.service.js";

const sanitizeResume = (value: unknown, fallback: ResumeRecord): ResumeRecord => {
	const input = (value ?? {}) as Partial<ResumeRecord>;
	const templateKeyInput = input.templateKey;
	const templateKey: ResumeTemplateKey =
		templateKeyInput === "harvard_classic_v1" || templateKeyInput === "ats_classic_v1"
			? templateKeyInput
			: fallback.templateKey ?? "ats_classic_v1";
	return {
		templateKey,
		content: normalizeResumeContent(
			(input.content as ResumeRecord["content"]) ?? fallback.content,
		),
		layout: normalizeResumeLayout(
			(input.layout as ResumeRecord["layout"]) ?? fallback.layout ?? defaultResumeLayout,
		),
	};
};

const getMyResume = async (req: Request, res: Response) => {
	const resume = await getOrCreateResumeByUserId(req.auth!.userId);
	if (!resume) {
		res.status(404).json({ message: "Resume not found." });
		return;
	}
	const validation = validateResume(resume);
	res.json({ resume, validation });
};

const updateMyResume = async (req: Request, res: Response) => {
	const existing = await getOrCreateResumeByUserId(req.auth!.userId);
	if (!existing) {
		res.status(404).json({ message: "Resume not found." });
		return;
	}
	const payload = sanitizeResume(req.body?.resume, existing);
	const resume = await updateResumeByUserId(req.auth!.userId, payload);
	if (!resume) {
		res.status(404).json({ message: "Resume not found." });
		return;
	}
	const validation = validateResume(resume);
	res.json({ resume, validation });
};

const syncMyResumeToPortfolio = async (req: Request, res: Response) => {
	const portfolio = await syncResumeToPortfolioByUserId(req.auth!.userId);
	if (!portfolio) {
		res.status(404).json({ message: "Portfolio not found." });
		return;
	}
	res.json({ portfolio });
};

const sendPdfResponse = (
	req: Request,
	res: Response,
	payload: {
		doc: Exclude<Awaited<ReturnType<typeof getResumePdfByUsername>>, null>["doc"];
		validation: Exclude<Awaited<ReturnType<typeof getResumePdfByUsername>>, null>["validation"];
	},
	filenameBase: string,
) => {
	if (!payload.validation.canExportPdf || !payload.doc) {
		res.status(422).json({
			message: "Resume contains hard validation errors and cannot be exported.",
			validation: payload.validation,
		});
		return;
	}

	const forceDownload = String(req.query.download ?? "") === "1";
	res.setHeader("Content-Type", "application/pdf");
	res.setHeader(
		"Content-Disposition",
		`${forceDownload ? "attachment" : "inline"}; filename=\"${filenameBase}-resume.pdf\"`,
	);

	payload.doc.pipe(res);
	payload.doc.end();
};

const downloadMyResumePdf = async (req: Request, res: Response) => {
	const result = await getResumePdfByUserId(req.auth!.userId);
	if (!result) {
		res.status(404).json({ message: "Resume not found." });
		return;
	}
	const filenameBase = req.auth?.username ?? "resume";
	sendPdfResponse(req, res, result, filenameBase);
};

const downloadResumePdf = async (req: Request, res: Response) => {
	const username = String(req.params.username ?? "").trim().toLowerCase();
	const result = await getResumePdfByUsername(username);
	if (!result) {
		res.status(404).json({ message: "Resume not found." });
		return;
	}
	sendPdfResponse(req, res, result, username);
};

const ResumeController = {
	getMyResume,
	updateMyResume,
	syncMyResumeToPortfolio,
	downloadMyResumePdf,
	downloadResumePdf,
};

export default ResumeController;
