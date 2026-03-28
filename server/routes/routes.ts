import type { Express } from "express";
import ChatRouter from "./chat.routes.js";

export default function registerRoutes(app: Express) {
	app.get("/", (req, res) => {
		res.send("Server is up");
	});

	app.use("/chat", ChatRouter);
}
