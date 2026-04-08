import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveUploadsRoot = () => {
	const configuredRoot = process.env.UPLOADS_DIR?.trim();

	if (configuredRoot) {
		return path.resolve(configuredRoot);
	}

	// Serverless runtimes (including Vercel) only allow writes under /tmp.
	if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
		return path.resolve("/tmp/devportfolio/uploads");
	}

	return path.resolve(__dirname, "../uploads");
};

const uploadsRoot = resolveUploadsRoot();
const avatarsDir = path.join(uploadsRoot, "avatars");
const coversDir = path.join(uploadsRoot, "covers");

export const ensureUploadDirectories = () => {
	fs.mkdirSync(avatarsDir, { recursive: true });
	fs.mkdirSync(coversDir, { recursive: true });
};

export const getUploadsRoot = () => uploadsRoot;

export const getAvatarsDir = () => avatarsDir;
export const getCoversDir = () => coversDir;

export const toPublicAvatarPath = (filename: string) => `/uploads/avatars/${filename}`;
export const toPublicCoverPath = (filename: string) => `/uploads/covers/${filename}`;
