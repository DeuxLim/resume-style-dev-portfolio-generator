import type {
	ResumeContent,
	ResumeLayout,
	ResumeRecord,
	ResumeSectionKey,
	ResumeStructuredListItem,
} from "../types/resume.types.js";

const makeId = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "") || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const resumeSectionKinds: Record<ResumeSectionKey, "mandatory" | "important" | "optional"> = {
	header: "mandatory",
	experience: "mandatory",
	education: "mandatory",
	skills: "mandatory",
	summary: "important",
	projects: "important",
	certifications: "optional",
	awards: "optional",
	volunteer: "optional",
	languages: "optional",
	publications: "optional",
	custom: "optional",
};

export const defaultResumeSectionOrder: ResumeSectionKey[] = [
	"header",
	"summary",
	"experience",
	"education",
	"skills",
	"projects",
	"certifications",
	"awards",
	"volunteer",
	"languages",
	"publications",
	"custom",
];

export const defaultResumeVisibility: Record<ResumeSectionKey, boolean> = {
	header: true,
	summary: true,
	experience: true,
	education: true,
	skills: true,
	projects: true,
	certifications: false,
	awards: false,
	volunteer: false,
	languages: false,
	publications: false,
	custom: false,
};

export const defaultResumeLayout: ResumeLayout = {
	mode: "default",
	sectionOrder: [...defaultResumeSectionOrder],
	visibility: { ...defaultResumeVisibility },
	positions: {},
};

const listItem = (title: string): ResumeStructuredListItem => ({
	id: makeId(title),
	title,
	subtitle: "",
	date: "",
	location: "",
	details: [],
	url: "",
});

export const buildStarterResumeContent = (
	input: { fullName: string; email: string; location?: string; headline?: string },
): ResumeContent => ({
	header: {
		fullName: input.fullName,
		headline: input.headline ?? "Full Stack Developer",
		location: input.location ?? "",
		email: input.email,
		phone: "",
		websiteUrl: "",
		linkedinUrl: "",
		githubUrl: "",
		photoDataUrl: "",
	},
	summary:
		"Product-minded developer focused on building reliable and maintainable web applications with clean UX and practical architecture.",
	experience: [
		{
			id: makeId("experience-current"),
			role: "Full Stack Developer",
			company: "Your Company",
			location: "",
			startDate: "2024",
			endDate: "Present",
			isCurrent: true,
			bullets: [
				"Built and shipped features across frontend, backend, and database layers.",
				"Improved reliability by fixing production issues and strengthening validations.",
				"Collaborated with stakeholders to prioritize and deliver high-impact changes.",
			],
		},
	],
	education: [
		{
			id: makeId("education"),
			school: "Your University",
			degree: "BS Information Technology",
			location: "",
			graduationDate: "",
			details: [],
		},
	],
	skills: ["React", "TypeScript", "Node.js", "Express", "MySQL", "Tailwind CSS"],
	projects: [
		{
			id: makeId("project-main"),
			name: "Your Main Project",
			description: "One-line project impact summary.",
			url: "",
			highlights: ["Designed and built core features end-to-end."],
		},
	],
	certifications: [listItem("Certification")],
	awards: [listItem("Award")],
	volunteer: [listItem("Volunteer Experience")],
	languages: ["English"],
	publications: [listItem("Publication")],
	custom: [listItem("Custom Section Item")],
});

export const buildStarterResume = (input: {
	fullName: string;
	email: string;
	location?: string;
	headline?: string;
}): ResumeRecord => ({
	templateKey: "ats_classic_v1",
	content: buildStarterResumeContent(input),
	layout: { ...defaultResumeLayout },
});
