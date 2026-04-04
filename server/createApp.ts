import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import multer from "multer";
import { corsOptions } from "./config/cors.js";
import registerRoutes from "./routes/routes.js";
import { ensureUploadDirectories, getUploadsRoot } from "./lib/uploads.js";

export default function createApp() {
	const app = express();
	ensureUploadDirectories();

	app.use(cors(corsOptions));
	app.use(cookieParser());
	app.use(express.json({ limit: "1mb" }));
	app.use("/uploads", express.static(path.resolve(getUploadsRoot())));

	registerRoutes(app);

	app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
		if (err instanceof multer.MulterError) {
			res.status(400).json({ message: err.message });
			return;
		}

		if (err instanceof Error && err.message === "Invalid file type.") {
			res.status(400).json({ message: "Only JPEG, PNG, WEBP, or GIF images are allowed." });
			return;
		}

		next(err);
	});

	app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
		console.error("Unhandled API error:", err);
		const code = typeof err === "object" && err && "code" in err ? String((err as { code?: unknown }).code ?? "") : "";
		const message =
			typeof err === "object" && err && "message" in err
				? String((err as { message?: unknown }).message ?? "")
				: "";

		if (
			code === "ECONNREFUSED" ||
			code === "ENOTFOUND" ||
			code === "ETIMEDOUT" ||
			code === "EAI_AGAIN" ||
			code === "HANDSHAKE_SSL_ERROR" ||
			code === "EINVAL" ||
			message.includes("getaddrinfo")
		) {
			res.status(503).json({
				message: "Database is temporarily unavailable. Please try again shortly.",
			});
			return;
		}

		res.status(500).json({ message: "Internal server error." });
	});

	return app;
}
