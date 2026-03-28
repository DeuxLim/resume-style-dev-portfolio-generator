import type { CorsOptions } from "cors";

const DEFAULT_ALLOWED_ORIGINS = [
	"http://localhost:5173",
	"https://deux-dev-portfolio.vercel.app",
];

const parseAllowedOrigins = () => {
	const configuredOrigins =
		process.env.CLIENT_URLS ?? process.env.CLIENT_URL ?? "";

	return configuredOrigins
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);
};

const allowedOrigins = Array.from(
	new Set([...DEFAULT_ALLOWED_ORIGINS, ...parseAllowedOrigins()]),
);

export const corsOptions: CorsOptions = {
	origin(origin, callback) {
		// Allow non-browser requests and same-origin requests with no Origin header.
		if (!origin) {
			callback(null, true);
			return;
		}

		if (allowedOrigins.includes(origin)) {
			callback(null, true);
			return;
		}

		callback(new Error(`CORS blocked for origin: ${origin}`));
	},
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
	credentials: true,
	optionsSuccessStatus: 204,
};
