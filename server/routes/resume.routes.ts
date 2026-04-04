import { Router } from "express";
import ResumeController from "../controllers/resume.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const ResumeRouter = Router();

ResumeRouter.get("/me", requireAuth, ResumeController.getMyResume);
ResumeRouter.put("/me", requireAuth, ResumeController.updateMyResume);
ResumeRouter.get("/me/pdf", requireAuth, ResumeController.downloadMyResumePdf);
ResumeRouter.post(
	"/me/sync-portfolio",
	requireAuth,
	ResumeController.syncMyResumeToPortfolio,
);
ResumeRouter.get("/:username/pdf", ResumeController.downloadResumePdf);

export default ResumeRouter;
