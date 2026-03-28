import { GoogleGenAI } from "@google/genai";
import type { PortfolioRecord } from "../../shared/types/portfolio.types.js";

class GeminiService {
	public client: GoogleGenAI;

	constructor(apiKey: string) {
		if (!apiKey) {
			throw new Error("GEMINI_API_KEY is not defined");
		}

		this.client = new GoogleGenAI({ apiKey });
	}
}

const serviceCache = new Map<string, GeminiService>();

export const getGeminiService = (apiKey?: string) => {
	const resolvedKey = apiKey || process.env.GEMINI_API_KEY;

	if (!resolvedKey) {
		throw new Error("No Gemini API key is configured");
	}

	if (!serviceCache.has(resolvedKey)) {
		serviceCache.set(resolvedKey, new GeminiService(resolvedKey));
	}

	return serviceCache.get(resolvedKey)!;
};

export const buildPortfolioSystemPrompt = (portfolio: PortfolioRecord) => `
You are an AI assistant for ${portfolio.fullName}'s developer portfolio.

Your job is to answer as a helpful portfolio guide using only the information provided below.
Be direct, practical, and natural. Avoid buzzwords and avoid inventing details.
If something is missing from the portfolio data, say you do not see that information yet.

Profile
- Full name: ${portfolio.fullName}
- Headline: ${portfolio.headline}
- Location: ${portfolio.location}
- Experience summary: ${portfolio.experienceSummary}
- Education: ${portfolio.education}
- Availability: ${portfolio.availability}
- Email: ${portfolio.email}
- Phone: ${portfolio.phone || "Not provided"}
- GitHub: ${portfolio.githubUrl || "Not provided"}
- LinkedIn: ${portfolio.linkedinUrl || "Not provided"}

About
${portfolio.about.map((paragraph) => `- ${paragraph}`).join("\n")}

Timeline
${portfolio.timeline
	.map(
		(item) =>
			`- ${item.year}: ${item.position}${item.company ? ` at ${item.company}` : ""}${item.note ? ` (${item.note})` : ""}`,
	)
	.join("\n")}

Experience
${portfolio.experiences
	.map(
		(item) =>
			`- ${item.role} at ${item.company} (${item.period})\n${item.highlights
				.map((highlight) => `  - ${highlight}`)
				.join("\n")}`,
	)
	.join("\n")}

Tech Stack
${portfolio.techCategories
	.map((category) => `- ${category.name}: ${category.items.join(", ")}`)
	.join("\n")}

Projects
${portfolio.projects
	.map(
		(project) =>
			`- ${project.name}: ${project.description}${project.url ? ` (${project.url})` : ""}`,
	)
	.join("\n")}

Custom Sections
${portfolio.customSections.length
	? portfolio.customSections
			.map((section) => `- ${section.title}: ${section.body}`)
			.join("\n")
	: "- No custom sections"}
`;
