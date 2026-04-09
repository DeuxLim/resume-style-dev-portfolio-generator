import { Router } from "express";
import ResumeController from "../controllers/resume.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const ResumeRouter = Router();

ResumeRouter.get("/me", requireAuth, ResumeController.getMyResume);
ResumeRouter.put("/me", requireAuth, ResumeController.updateMyResume);
ResumeRouter.get(
	"/me/versions",
	requireAuth,
	ResumeController.listMyResumeVersions,
);
ResumeRouter.get(
	"/me/versions/preview",
	requireAuth,
	ResumeController.getMyResumeVersionPreview,
);
ResumeRouter.get(
	"/me/versions/:versionId",
	requireAuth,
	ResumeController.getMyResumeVersion,
);
ResumeRouter.post(
	"/me/versions",
	requireAuth,
	ResumeController.createMyResumeVersion,
);
ResumeRouter.put(
	"/me/versions/:versionId/activate",
	requireAuth,
	ResumeController.activateMyResumeVersion,
);
ResumeRouter.put(
	"/me/versions/:versionId",
	requireAuth,
	ResumeController.renameMyResumeVersion,
);
ResumeRouter.put(
	"/me/versions/:versionId/snapshot",
	requireAuth,
	ResumeController.updateMyResumeVersionSnapshot,
);
ResumeRouter.get(
	"/me/versions/:versionId/pdf",
	requireAuth,
	ResumeController.downloadMyResumeVersionPdf,
);
ResumeRouter.delete(
	"/me/versions/:versionId",
	requireAuth,
	ResumeController.deleteMyResumeVersion,
);
ResumeRouter.get("/me/pdf", requireAuth, ResumeController.downloadMyResumePdf);
ResumeRouter.post(
	"/me/sync-portfolio",
	requireAuth,
	ResumeController.syncMyResumeToPortfolio,
);
ResumeRouter.post("/guest/pdf", ResumeController.downloadGuestResumePdf);
ResumeRouter.get("/:username/pdf", ResumeController.downloadResumePdf);

export default ResumeRouter;
