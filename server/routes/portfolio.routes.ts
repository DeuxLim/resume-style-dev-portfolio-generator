import { Router } from "express";
import PortfolioController from "../controllers/portfolio.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const PortfolioRouter = Router();

PortfolioRouter.get("/me", requireAuth, PortfolioController.getMyPortfolio);
PortfolioRouter.put("/me", requireAuth, PortfolioController.updateMyPortfolio);
PortfolioRouter.get("/:username", PortfolioController.getPublicPortfolio);

export default PortfolioRouter;
