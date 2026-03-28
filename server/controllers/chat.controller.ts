import type { Request, Response } from "express";
import { getGeminiService, SYSTEM_PROMPT } from "../services/gemini.service.js";

const sendMessage = async (req: Request, res: Response) => {
	const { newMessage, history } = req.body;
	const contents = [...history, newMessage];

	res.setHeader("Content-Type", "text/plain");
	res.setHeader("Transfer-Encoding", "chunked");

	try {
		const geminiService = getGeminiService();

		const stream = await geminiService.client.models.generateContentStream({
			model: "gemini-3-flash-preview",
			config: {
				systemInstruction: SYSTEM_PROMPT,
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
