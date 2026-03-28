import type { Express } from "express";
import AuthRouter from "./auth.routes.js";
import ChatRouter from "./chat.routes.js";
import PortfolioRouter from "./portfolio.routes.js";

export default function registerRoutes(app: Express) {
	app.get("/api/health", (_req, res) => {
		res.json({ ok: true });
	});

	app.use("/api/auth", AuthRouter);
	app.use("/api/chat", ChatRouter);
	app.use("/api/portfolios", PortfolioRouter);
}
