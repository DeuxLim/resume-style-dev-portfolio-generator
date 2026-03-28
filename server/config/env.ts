import dotenv from "dotenv";
import fs from "fs";
import path from "path";

let loaded = false;

export const loadEnv = () => {
	if (loaded) {
		return;
	}

	const candidates = [
		path.resolve(process.cwd(), ".env"),
		path.resolve(process.cwd(), "../.env"),
	];

	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) {
			dotenv.config({ path: candidate });
			loaded = true;
			return;
		}
	}

	dotenv.config();
	loaded = true;
};
