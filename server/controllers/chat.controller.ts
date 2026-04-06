import type { Request, Response } from "express";
import { buildPortfolioSystemPrompt, getGeminiService } from "../services/gemini.service.js";
import { getDb } from "../lib/db.js";
import type { RowDataPacket } from "mysql2";
import { mapPortfolioRow, toPublicPortfolio } from "../lib/portfolio.js";

type ChatPortfolioRow = RowDataPacket & {
	email: string;
	username: string;
	full_name: string;
	headline: string;
	location: string;
	experience_summary: string;
	education: string;
	availability: string;
	phone: string;
	avatar_url: string;
	cover_url: string;
	github_url: string;
	github_username: string;
	linkedin_url: string;
	header_actions_json: string | null;
	about_json: string | null;
	timeline_json: string | null;
	experiences_json: string | null;
	tech_categories_json: string | null;
	projects_json: string | null;
	custom_sections_json: string | null;
	layout_json: string | null;
	chat_enabled: number;
	gemini_api_key: string | null;
};

const getChatPortfolio = async (username: string) => {
	const db = getDb();
	const [rows] = await db.query<ChatPortfolioRow[]>(
		`
			SELECT
				u.email,
				COALESCE(NULLIF(p.public_slug, ''), u.username) AS username,
				p.full_name,
				p.headline,
				p.location,
				p.experience_summary,
				p.education,
				p.availability,
				p.phone,
				p.avatar_url,
				p.cover_url,
				p.github_url,
				p.github_username,
				p.linkedin_url,
				p.header_actions_json,
				p.about_json,
				p.timeline_json,
				p.experiences_json,
				p.tech_categories_json,
				p.projects_json,
				p.custom_sections_json,
				p.layout_json,
				p.chat_enabled,
				p.gemini_api_key
			FROM portfolios p
			INNER JOIN users u ON u.id = p.user_id
			WHERE LOWER(COALESCE(NULLIF(p.public_slug, ''), u.username)) = ?
			LIMIT 1
		`,
		[username.trim().toLowerCase()],
	);

	return rows[0] ?? null;
};

const sendMessage = async (req: Request, res: Response) => {
	const { newMessage, history } = req.body;
	const username = String(req.body.username ?? "").trim().toLowerCase();

	if (!username) {
		res.status(400).json({ message: "Portfolio URL slug is required." });
		return;
	}

	const portfolioRow = await getChatPortfolio(username);

	if (!portfolioRow) {
		res.status(404).json({ message: "Portfolio not found." });
		return;
	}

	if (!portfolioRow.chat_enabled) {
		res.status(403).json({ message: "Chat is disabled for this portfolio." });
		return;
	}

	const portfolio = toPublicPortfolio(mapPortfolioRow(portfolioRow));
	const contents = [...history, newMessage];

	res.setHeader("Content-Type", "text/plain");
	res.setHeader("Transfer-Encoding", "chunked");

	try {
		const geminiService = getGeminiService(
			portfolioRow.gemini_api_key ?? undefined,
		);

		const stream = await geminiService.client.models.generateContentStream({
			model: "gemini-3-flash-preview",
			config: {
				systemInstruction: buildPortfolioSystemPrompt(portfolio),
			},
			contents,
		});

		for await (const chunk of stream) {
			res.write(chunk.text);
		}
	} catch (error) {
		console.log(error);
		res.write("Something went wrong. Please try again later. [backend]");
	} finally {
		res.end();
	}
};

const ChatController = { sendMessage };
export default ChatController;
