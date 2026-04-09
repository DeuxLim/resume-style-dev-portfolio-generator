import type {
	EditablePortfolio,
	ExperienceItem,
	HeaderAction,
	PortfolioLayout,
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

const headerActionId = (value: string) =>
	makeId(value) || `action-${Math.random().toString(16).slice(2, 8)}`;

export const buildDefaultHeaderActions = ({
	githubUrl,
	linkedinUrl,
	email,
	phone,
}: {
	githubUrl: string;
	linkedinUrl: string;
	email: string;
	phone: string;
}): HeaderAction[] => [
	{
		id: headerActionId("github"),
		label: "Github",
		type: "github",
		value: githubUrl,
		display: "label",
	},
	{
		id: headerActionId("linkedin"),
		label: "LinkedIn",
		type: "linkedin",
		value: linkedinUrl,
		display: "label",
	},
	{
		id: headerActionId("email"),
		label: "Email",
		type: "email",
		value: email,
		display: "value",
	},
	{
		id: headerActionId("phone"),
		label: "Phone",
		type: "phone",
		value: phone,
		display: "value",
	},
];

export const defaultPortfolioLayout: PortfolioLayout = {
	sectionOrder: [
		"about",
		"timeline",
		"experience",
		"tech",
		"projects",
		"heatmap",
		"custom",
	],
	sectionSpans: {
		about: 8,
		timeline: 4,
		experience: 8,
		tech: 4,
		projects: 12,
		heatmap: 6,
		custom: 6,
	},
	sectionHeights: {
		about: 7,
		timeline: 7,
		experience: 7,
		tech: 7,
		projects: 6,
		heatmap: 5,
		custom: 5,
	},
	sectionPositions: {
		about: { x: 0, y: 0 },
		timeline: { x: 8, y: 0 },
		experience: { x: 0, y: 7 },
		tech: { x: 8, y: 7 },
		projects: { x: 0, y: 14 },
		heatmap: { x: 0, y: 20 },
		custom: { x: 6, y: 20 },
	},
};

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
	avatarUrl: "/default-avatar.svg",
	coverUrl: "/default-cover.svg",
	githubUrl: "",
	githubUsername: "",
	linkedinUrl: "",
	headerActions: [],
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
	layout: { ...defaultPortfolioLayout },
	chatEnabled: true,
	geminiApiKey: "",
	hasCustomGeminiKey: false,
});

export const samplePortfolio: PortfolioRecord = {
	...buildStarterPortfolio("alexramos", "alex.ramos.dev@example.com", "Alex Ramos"),
	headline: "Junior Full Stack Developer (Laravel + React)",
	location: "Quezon City, Philippines",
	experienceSummary: "1.5 years building web apps and internal tools",
	education: "BS Information Technology",
	availability: "Open to junior full-time and internship roles",
	phone: "+63 917-555-0137",
	avatarUrl: "",
	coverUrl: "",
	githubUrl: "https://github.com/octocat",
	githubUsername: "DeuxLim",
	linkedinUrl: "https://www.linkedin.com/in/alex-ramos-dev",
	headerActions: buildDefaultHeaderActions({
		githubUrl: "https://github.com/octocat",
		linkedinUrl: "https://www.linkedin.com/in/alex-ramos-dev",
		email: "alex.ramos.dev@example.com",
		phone: "+63 917-555-0137",
	}),
	about: [
		"I'm a junior developer who enjoys turning UI mockups into responsive pages and connecting them to clean backend APIs.",
		"I build with Laravel, React, and SQL, and I focus on writing readable code, clear commit history, and practical features users can feel.",
		"I'm currently improving my testing and system design skills while shipping small projects consistently.",
		"I work best in collaborative teams where code reviews, documentation, and steady delivery are part of the workflow.",
		"I'm comfortable owning small features end to end, from planning and implementation to testing and deployment.",
		"I value maintainable code and predictable UX, especially for forms, data tables, and dashboard workflows.",
	],
	timeline: timeline([
		{
			year: "2026",
			position: "Junior Web Developer",
			company: "Brightlane Solutions",
			note: "Current role",
		},
		{
			year: "2025",
			position: "Web Development Intern",
			company: "Brightlane Solutions",
			note: "Built admin UI and API endpoints",
		},
		{
			year: "2024",
			position: "BS Information Technology",
			company: "National College of Science and Technology",
			note: "Graduated",
		},
		{
			year: "2023",
			position: "Freelance Project Contributor",
			company: "Student Clients",
			note: "Built small business landing pages",
		},
		{
			year: "2022",
			position: "Frontend Projects",
			company: "Self-learning",
			note: "Built React projects and UI clones",
		},
		{
			year: "2021",
			position: "Started Web Development",
			company: "",
			note: "First HTML, CSS, and JavaScript projects",
		},
		{
			year: "2020",
			position: "Built First Static Site",
			company: "Personal Project",
			note: "Portfolio prototype and simple contact page",
		},
		{
			year: "2019",
			position: "Explored Programming Basics",
			company: "Self-learning",
			note: "Started with simple JavaScript exercises",
		},
	]),
	experiences: experiences([
		{
			role: "Junior Web Developer",
			company: "Brightlane Solutions",
			period: "Jan 2026 — Present",
				highlights: [
					"Built and maintained internal modules with Laravel, React, and MySQL for operations teams",
					"Converted Figma screens into reusable frontend components and improved mobile responsiveness",
					"Added validation and basic feature tests for key forms to reduce regressions",
					"Helped triage production bugs and delivered fixes with clear root-cause notes",
					"Collaborated with QA and product team during weekly sprint releases",
					"Wrote technical notes for feature handoff and onboarding docs for newer teammates",
					"Worked on API pagination, sorting, and filtering to improve dashboard usability",
				],
			},
		{
			role: "Web Development Intern",
			company: "Brightlane Solutions",
			period: "Jun 2025 — Dec 2025",
				highlights: [
					"Shipped dashboard UI updates and bug fixes under mentorship from senior developers",
					"Helped document endpoints and assisted in QA for release candidates",
					"Implemented CRUD forms with server-side validation and flash messaging",
					"Wrote API integration notes used by incoming interns",
					"Built reusable table and modal components to reduce duplicated frontend code",
					"Participated in sprint planning and daily syncs with engineering team",
				],
			},
		{
			role: "Freelance Junior Developer",
			company: "Local Small Businesses",
			period: "2023 — 2024",
				highlights: [
					"Built responsive marketing pages and contact forms for local shops",
					"Integrated basic analytics and SEO metadata for better discoverability",
					"Handled deployment updates and content changes after launch",
					"Maintained client change requests and versioned updates through Git branches",
					"Coordinated directly with non-technical owners for feedback and revisions",
				],
			},
			{
				role: "Capstone Team Developer",
				company: "NCST Academic Project",
				period: "2024",
				highlights: [
					"Implemented user authentication and role permissions for a campus services app",
					"Designed key database tables and basic reporting endpoints",
					"Built responsive admin pages and student self-service forms",
					"Presented project architecture and demo flow during final defense",
				],
			},
		]),
	techCategories: categories([
		{
			name: "Frontend",
			items: [
				"React",
				"TypeScript",
				"Tailwind CSS",
				"JavaScript",
				"HTML/CSS",
				"Shadcn UI",
				"Responsive Design",
				"Form UX Patterns",
				"State Management (Context)",
			],
		},
		{
			name: "Backend",
			items: [
				"PHP",
				"Laravel",
				"Node.js",
				"Express",
				"MySQL",
				"REST API Design",
				"Form Validation",
				"Authentication",
				"Eloquent ORM",
			],
		},
		{
			name: "Tools",
			items: [
				"Git",
				"GitHub",
				"Postman",
				"Figma",
				"Vercel",
				"Notion",
				"Jira",
				"VS Code",
				"npm",
			],
		},
	]),
	projects: projects([
		{
			name: "TaskBoard Lite",
			description: "Kanban-style task tracker with drag-and-drop columns and auth",
			url: "https://taskboard-lite-demo.vercel.app",
		},
		{
			name: "Campus Event Hub",
			description: "Event listing and registration app with admin management panel",
			url: "https://campus-event-hub.vercel.app",
		},
		{
			name: "Mini Shop API",
			description: "REST API for products, orders, and role-based access control",
			url: "https://mini-shop-api.onrender.com",
		},
		{
			name: "Support Ticket Portal",
			description: "Internal ticket dashboard with role-based status workflows",
			url: "https://support-ticket-portal.vercel.app",
		},
	]),
	customSections: [
		{
			id: "learning-focus",
			title: "Current Learning Focus",
			type: "bullets",
			body: "",
			items: [
				"Writing integration tests for Laravel APIs",
				"Improving React component architecture and reusability",
				"Practicing SQL query optimization for reporting pages",
				"Building stronger error handling and loading states in UI",
				"Learning clean branching and pull request workflows",
				"Improving accessibility with keyboard-first navigation",
				"Using reusable query/filter hooks for dashboard pages",
			],
			links: [],
		},
		{
			id: "certifications",
			title: "Recent Certifications",
			type: "bullets",
			body: "",
			items: [
				"Responsive Web Design Certification",
				"JavaScript Algorithms and Data Structures",
				"Laravel Fundamentals Course Completion",
				"Frontend Developer Career Path",
				"SQL for Data Analysis Basics",
			],
			links: [],
		},
		{
			id: "community",
			title: "Community and Collaboration",
			type: "bullets",
			body: "",
			items: [
				"Joins local developer meetups and online code review sessions",
				"Shares beginner-friendly Laravel and React notes on personal blog",
				"Contributes small fixes and docs updates to open-source repositories",
			],
			links: [],
		},
		{
			id: "quick-links",
			title: "Quick Links",
			type: "links",
			body: "",
			items: [],
			links: [
				{
					id: "quick-link-github",
					label: "GitHub Profile",
					url: "https://github.com/octocat",
				},
				{
					id: "quick-link-linkedin",
					label: "LinkedIn",
					url: "https://www.linkedin.com/in/alex-ramos-dev",
				},
				{
					id: "quick-link-resume",
					label: "Resume PDF",
					url: "https://example.com/alex-ramos-resume.pdf",
				},
					{
						id: "quick-link-email",
						label: "Email",
						url: "mailto:alex.ramos.dev@example.com",
					},
					{
						id: "quick-link-portfolio",
						label: "Portfolio Live",
						url: "https://alex-ramos-portfolio.vercel.app",
					},
					{
						id: "quick-link-blog",
						label: "Dev Notes Blog",
						url: "https://alex-ramos-dev-notes.vercel.app",
					},
				],
			},
		],
	layout: {
		...defaultPortfolioLayout,
		sectionHeights: {
			about: 8,
			timeline: 8,
			experience: 11,
			tech: 11,
			projects: 9,
			heatmap: 7,
			custom: 7,
		},
		sectionPositions: {
			about: { x: 0, y: 0 },
			timeline: { x: 8, y: 0 },
			experience: { x: 0, y: 8 },
			tech: { x: 8, y: 8 },
			projects: { x: 0, y: 19 },
			heatmap: { x: 0, y: 28 },
			custom: { x: 6, y: 28 },
		},
	},
	chatEnabled: true,
};
