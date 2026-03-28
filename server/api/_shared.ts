import { getGeminiService, SYSTEM_PROMPT } from "../services/gemini.service.js";
import type { Message } from "../../shared/types/gemini.types.js";

type HeaderValue = string | string[] | undefined;

type VercelRequest = {
	method?: string;
	url?: string;
	headers: Record<string, HeaderValue>;
	body?: unknown;
	on: (event: string, listener: (chunk: Buffer) => void) => void;
};

type VercelResponse = {
	statusCode: number;
	setHeader: (name: string, value: string | string[]) => void;
	end: (chunk?: string) => void;
	write: (chunk: string) => void;
};

const DEFAULT_ALLOWED_ORIGINS = [
	"http://localhost:5173",
	"https://deux-dev-portfolio.vercel.app",
];

const getAllowedOrigins = () => {
	const configuredOrigins =
		process.env.CLIENT_URLS ?? process.env.CLIENT_URL ?? "";

	return Array.from(
		new Set([
			...DEFAULT_ALLOWED_ORIGINS,
			...configuredOrigins
				.split(",")
				.map((origin) => origin.trim())
				.filter(Boolean),
		]),
	);
};

const setCorsHeaders = (req: VercelRequest, res: VercelResponse) => {
	const origin = req.headers.origin;
	const allowedOrigins = getAllowedOrigins();

	if (typeof origin === "string" && allowedOrigins.includes(origin)) {
		res.setHeader("Access-Control-Allow-Origin", origin);
		res.setHeader("Vary", "Origin");
	}

	res.setHeader(
		"Access-Control-Allow-Methods",
		"GET,POST,PUT,DELETE,OPTIONS",
	);
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const readJsonBody = async <T>(req: VercelRequest): Promise<T> => {
	if (req.body && typeof req.body === "object") {
		return req.body as T;
	}

	const chunks: Buffer[] = [];

	await new Promise<void>((resolve, reject) => {
		req.on("data", (chunk) => chunks.push(chunk));
		req.on("end", () => resolve());
		req.on("error", reject);
	});

	return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
};

export const handleApiRequest = async (
	req: VercelRequest,
	res: VercelResponse,
) => {
	setCorsHeaders(req, res);

	if (req.method === "OPTIONS") {
		res.statusCode = 204;
		res.end();
		return;
	}

	const pathname = new URL(req.url ?? "/", "http://localhost").pathname;

	if (req.method === "GET" && (pathname === "/" || pathname === "/api")) {
		res.statusCode = 200;
		res.setHeader("Content-Type", "text/plain; charset=utf-8");
		res.end("Server is up");
		return;
	}

	if (
		req.method === "POST" &&
		(pathname === "/chat/send-message" ||
			pathname === "/api/chat/send-message")
	) {
		type ChatPayload = {
			newMessage: Message;
			history: Message[];
		};

		try {
			const { newMessage, history } = await readJsonBody<ChatPayload>(req);
			const contents = [...history, newMessage];
			const geminiService = getGeminiService();

			res.statusCode = 200;
			res.setHeader("Content-Type", "text/plain; charset=utf-8");
			res.setHeader("Transfer-Encoding", "chunked");

			const stream = await geminiService.client.models.generateContentStream({
				model: "gemini-3-flash-preview",
				config: {
					systemInstruction: SYSTEM_PROMPT,
				},
				contents,
			});

			for await (const chunk of stream) {
				if (chunk.text) {
					res.write(chunk.text);
				}
			}

			res.end();
			return;
		} catch (error) {
			console.error(error);
			res.statusCode = 500;
			res.setHeader("Content-Type", "text/plain; charset=utf-8");
			res.end("Something went wrong. Please try again later. [backend]");
			return;
		}
	}

	res.statusCode = 404;
	res.setHeader("Content-Type", "application/json; charset=utf-8");
	res.end(JSON.stringify({ error: "Not found" }));
};
