import type {
	EditablePortfolio,
	ExperienceItem,
	PortfolioRecord,
	ProjectItem,
	TechCategory,
	TimelineItem,
} from "../types/portfolio.types.js";

const makeId = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

const timeline = (items: Omit<TimelineItem, "id">[]): TimelineItem[] =>
	items.map((item) => ({
		...item,
		id: `${makeId(item.year)}-${makeId(item.position)}`,
	}));

const experiences = (
	items: Omit<ExperienceItem, "id">[],
): ExperienceItem[] =>
	items.map((item) => ({
		...item,
		id: `${makeId(item.role)}-${makeId(item.company)}`,
	}));

const projects = (items: Omit<ProjectItem, "id">[]): ProjectItem[] =>
	items.map((item) => ({
		...item,
		id: makeId(item.name),
	}));

const categories = (items: Omit<TechCategory, "id">[]): TechCategory[] =>
	items.map((item) => ({
		...item,
		id: makeId(item.name),
	}));

export const buildStarterPortfolio = (
	username: string,
	email: string,
	fullName = "Your Name",
): EditablePortfolio => ({
	username,
	fullName,
	headline: "Full Stack Developer",
	location: "Your City",
	experienceSummary: "2+ years building practical web applications",
	education: "BS Information Technology",
	availability: "Open to remote, freelance, and full-time opportunities",
	email,
	phone: "",
	avatarUrl: "",
	coverUrl: "",
	githubUrl: "",
	githubUsername: "",
	linkedinUrl: "",
	about: [
		"Write a short introduction about what you build and the kind of problems you like working on.",
		"Keep it simple and practical so visitors understand your strengths quickly.",
	],
	timeline: timeline([
		{
			year: new Date().getFullYear().toString(),
			position: "Full Stack Developer",
			company: "Your Company",
			note: "Current role",
		},
		{
			year: "Start",
			position: "Your Career Started",
			company: "",
			note: "Add a quick milestone",
		},
	]),
	experiences: experiences([
		{
			role: "Full Stack Developer",
			company: "Your Company",
			period: "2024 — Present",
			highlights: [
				"Ship features end-to-end across frontend, backend, and database layers",
				"Write clean, maintainable code and focus on practical product improvements",
			],
		},
	]),
	techCategories: categories([
		{
			name: "Frontend",
			items: ["React", "TypeScript", "Tailwind CSS"],
		},
		{
			name: "Backend",
			items: ["Node.js", "Express", "MySQL"],
		},
		{
			name: "Tools",
			items: ["Git", "GitHub", "Vercel"],
		},
	]),
	projects: projects([
		{
			name: "Your Main Project",
			description: "Describe a project you are proud of in one line.",
			url: "",
		},
	]),
	customSections: [],
	chatEnabled: true,
	geminiApiKey: "",
	hasCustomGeminiKey: false,
});

export const samplePortfolio: PortfolioRecord = {
	...buildStarterPortfolio("deuxlim", "limdeux27@gmail.com", "Deux Daniel Lim"),
	headline: "Full Stack Developer (Laravel & React)",
	location: "Metro Manila, Philippines",
	experienceSummary: "3+ years shipping production systems and integrations",
	education: "BS Information Technology · Cum Laude",
	availability: "Open to remote, hybrid, contract, and project-based work",
	phone: "+63 945-428-6156",
	avatarUrl: "",
	coverUrl: "",
	githubUrl: "https://github.com/DeuxLim",
	githubUsername: "deuxlim",
	linkedinUrl: "https://www.linkedin.com/in/deux-lim-522050263/",
	about: [
		"I'm a full-stack web developer focused on practical systems, maintainable code, and shipping features that solve real problems.",
		"I work across React, TypeScript, Laravel, Express, MySQL, integrations, and AI features without making the stack more complicated than it needs to be.",
		"I like building products that feel clean, reliable, and useful, whether it's a portfolio, an internal tool, or a customer-facing platform.",
	],
	timeline: timeline([
		{
			year: "2026",
			position: "Full Stack Developer",
			company: "Orro Group",
			note: "",
		},
		{
			year: "2023",
			position: "Frontend Developer Intern",
			company: "Orro Group",
			note: "",
		},
		{
			year: "2023",
			position: "BS Information Technology",
			company: "La Consolacion University",
			note: "Cum Laude",
		},
		{
			year: "2020",
			position: "Hello World!",
			company: "",
			note: "",
		},
	]),
	experiences: experiences([
		{
			role: "Full Stack Developer",
			company: "Orro Group",
			period: "Mar 2023 — Present",
			highlights: [
				"Develop and maintain enterprise monitoring, ticketing, and workflow systems using Laravel, JavaScript, and MySQL",
				"Build integrations with Jira, ServiceNow, Freshservice, and vendor APIs",
				"Implement AI-powered features and automation workflows for operational teams",
				"Deliver bug fixes, UX improvements, and performance work across large production systems",
			],
		},
		{
			role: "Developer Intern",
			company: "Orro Group",
			period: "Mar 2023 — Jun 2023",
			highlights: [
				"Supported CRM development across frontend and backend tasks",
				"Worked closely with senior developers and production workflows",
			],
		},
	]),
	techCategories: categories([
		{
			name: "Frontend",
			items: ["JavaScript", "TypeScript", "React", "Tailwind CSS", "HTML", "CSS"],
		},
		{
			name: "Backend",
			items: ["PHP", "Laravel", "Node.js", "Express", "MySQL", "MongoDB"],
		},
		{
			name: "Others",
			items: ["Git", "GitHub", "GitLab", "Docker", "Postman", "OpenAI", "Claude"],
		},
	]),
	projects: projects([
		{
			name: "Developer Portfolio",
			description: "Resume-style developer portfolio",
			url: "https://deux-dev-portfolio.vercel.app",
		},
		{
			name: "Messenger Clone",
			description: "Real-time chat app",
			url: "https://messenger-clone-iota-vert.vercel.app",
		},
		{
			name: "MILE 365 Run Club",
			description: "Membership system and dashboard",
			url: "https://mile365-runclub-landing.vercel.app",
		},
		{
			name: "VaultPass",
			description: "Secure password manager",
			url: "",
		},
	]),
	customSections: [
		{
			id: "builder-note",
			title: "What This App Is",
			body: "This portfolio now works as a builder for other developers too. Each user can sign up, edit their profile, manage sections, and get a public portfolio URL on the same app.",
		},
	],
	chatEnabled: true,
};
