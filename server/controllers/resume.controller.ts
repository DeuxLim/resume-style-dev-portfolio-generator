import type { Request, Response } from "express";
import { buildStarterResume, defaultResumeLayout } from "../../shared/defaults/resume.js";
import { normalizeResumeContent, normalizeResumeLayout, validateResume } from "../../shared/lib/resume.js";
import type {
	ResumeRecord,
	ResumeTemplateKey,
	ResumeVersionBase,
} from "../../shared/types/resume.types.js";
import {
	activateResumeVersionByUserId,
	createResumeVersionByUserId,
	deleteResumeVersionByUserId,
	getOrCreateResumeByUserId,
	getResumeVersionBasePreviewByUserId,
	getResumeVersionDetailByUserId,
	getResumePdfByUserId,
	getResumePdfByVersionId,
	getResumePdfByUsername,
	getResumePdfByRecord,
	listResumeVersionsByUserId,
	renameResumeVersionByUserId,
	syncResumeToPortfolioByUserId,
	updateResumeVersionSnapshotByUserId,
	updateResumeByUserId,
} from "../services/resume.service.js";

const sanitizeResume = (value: unknown, fallback: ResumeRecord): ResumeRecord => {
	const input = (value ?? {}) as Partial<ResumeRecord>;
	const templateKeyInput = input.templateKey;
	const templateKey: ResumeTemplateKey =
		templateKeyInput === "deux_modern_v1"
			? templateKeyInput
			: fallback.templateKey ?? "deux_modern_v1";
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

const listMyResumeVersions = async (req: Request, res: Response) => {
	const versions = await listResumeVersionsByUserId(req.auth!.userId);
	res.json({ versions });
};

const getMyResumeVersion = async (req: Request, res: Response) => {
	const versionId = Number(req.params.versionId);
	if (!Number.isFinite(versionId) || versionId <= 0) {
		res.status(400).json({ message: "Invalid version id." });
		return;
	}

	const detail = await getResumeVersionDetailByUserId(req.auth!.userId, versionId);
	if (!detail) {
		res.status(404).json({ message: "Version not found." });
		return;
	}

	res.json(detail);
};

const getMyResumeVersionPreview = async (req: Request, res: Response) => {
	const baseInput = String(req.query?.base ?? "latest").toLowerCase();
	const base: ResumeVersionBase =
		baseInput === "blank" || baseInput === "live" || baseInput === "latest"
			? (baseInput as ResumeVersionBase)
			: "latest";

	const resume = await getResumeVersionBasePreviewByUserId(req.auth!.userId, base);
	if (!resume) {
		res.status(404).json({ message: "Resume not found." });
		return;
	}
	res.json({ resume });
};

const createMyResumeVersion = async (req: Request, res: Response) => {
	const name = String(req.body?.name ?? "");
	const baseInput = String(req.body?.base ?? "latest").toLowerCase();
	const base: ResumeVersionBase =
		baseInput === "blank" || baseInput === "live" || baseInput === "latest"
			? (baseInput as ResumeVersionBase)
			: "latest";

	let sanitizedResume: ResumeRecord | undefined;
	if (req.body?.resume !== undefined) {
		const current = await getOrCreateResumeByUserId(req.auth!.userId);
		if (!current) {
			res.status(404).json({ message: "Resume not found." });
			return;
		}
		sanitizedResume = sanitizeResume(req.body.resume, current);
	}

	const version = await createResumeVersionByUserId(req.auth!.userId, {
		name,
		base,
		...(sanitizedResume ? { resume: sanitizedResume } : {}),
	});
	if (version === "duplicate_snapshot") {
		res.status(409).json({
			message:
				"No changes detected from the most recent version. Edit the current draft instead.",
		});
		return;
	}
	if (!version) {
		res.status(404).json({ message: "Resume not found." });
		return;
	}
	res.status(201).json({ version });
};

const activateMyResumeVersion = async (req: Request, res: Response) => {
	const versionId = Number(req.params.versionId);

	if (!Number.isFinite(versionId) || versionId <= 0) {
		res.status(400).json({ message: "Invalid version id." });
		return;
	}

	const resume = await activateResumeVersionByUserId(req.auth!.userId, versionId);
	if (!resume) {
		res.status(404).json({ message: "Version not found." });
		return;
	}

	const validation = validateResume(resume);
	res.json({ resume, validation });
};

const deleteMyResumeVersion = async (req: Request, res: Response) => {
	const versionId = Number(req.params.versionId);

	if (!Number.isFinite(versionId) || versionId <= 0) {
		res.status(400).json({ message: "Invalid version id." });
		return;
	}

	const result = await deleteResumeVersionByUserId(req.auth!.userId, versionId);

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

const renameMyResumeVersion = async (req: Request, res: Response) => {
	const versionId = Number(req.params.versionId);

	if (!Number.isFinite(versionId) || versionId <= 0) {
		res.status(400).json({ message: "Invalid version id." });
		return;
	}

	const name = String(req.body?.name ?? "");
	const result = await renameResumeVersionByUserId(
		req.auth!.userId,
		versionId,
		name,
	);

	if (result === "not_found") {
		res.status(404).json({ message: "Version not found." });
		return;
	}

	if (result === "invalid_name") {
		res.status(400).json({ message: "Version name is required." });
		return;
	}

	res.json({ version: result });
};

const updateMyResumeVersionSnapshot = async (req: Request, res: Response) => {
	const versionId = Number(req.params.versionId);
	if (!Number.isFinite(versionId) || versionId <= 0) {
		res.status(400).json({ message: "Invalid version id." });
		return;
	}

	const current = await getOrCreateResumeByUserId(req.auth!.userId);
	if (!current) {
		res.status(404).json({ message: "Resume not found." });
		return;
	}

	const payload = sanitizeResume(req.body?.resume, current);
	const result = await updateResumeVersionSnapshotByUserId(
		req.auth!.userId,
		versionId,
		payload,
	);

	if (result === "not_found") {
		res.status(404).json({ message: "Version not found." });
		return;
	}

	if (result === "active_version") {
		res.status(409).json({
			message: "Live version should be saved from the main resume endpoint.",
		});
		return;
	}

	res.json(result);
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

const downloadMyResumeVersionPdf = async (req: Request, res: Response) => {
	const versionId = Number(req.params.versionId);
	if (!Number.isFinite(versionId) || versionId <= 0) {
		res.status(400).json({ message: "Invalid version id." });
		return;
	}

	const result = await getResumePdfByVersionId(req.auth!.userId, versionId);
	if (!result) {
		res.status(404).json({ message: "Resume version not found." });
		return;
	}
	const filenameBase = req.auth?.username ?? "resume";
	sendPdfResponse(req, res, result, `${filenameBase}-v${versionId}`);
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

const downloadGuestResumePdf = async (req: Request, res: Response) => {
	const fallback = buildStarterResume({
		fullName: "",
		email: "",
		location: "",
		headline: "",
	});
	const payload = sanitizeResume(req.body?.resume, fallback);
	const result = await getResumePdfByRecord(payload);
	sendPdfResponse(req, res, result, "resume");
};

const ResumeController = {
	getMyResume,
	updateMyResume,
	syncMyResumeToPortfolio,
	listMyResumeVersions,
	getMyResumeVersion,
	getMyResumeVersionPreview,
	createMyResumeVersion,
	activateMyResumeVersion,
	deleteMyResumeVersion,
	renameMyResumeVersion,
	updateMyResumeVersionSnapshot,
	downloadMyResumePdf,
	downloadMyResumeVersionPdf,
	downloadResumePdf,
	downloadGuestResumePdf,
};

export default ResumeController;
