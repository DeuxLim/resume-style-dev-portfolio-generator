import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { corsOptions } from "./config/cors.js";
import registerRoutes from "./routes/routes.js";

export default function createApp() {
	const app = express();

	app.use(cors(corsOptions));
	app.use(cookieParser());
	app.use(express.json({ limit: "1mb" }));

	registerRoutes(app);

	return app;
}
