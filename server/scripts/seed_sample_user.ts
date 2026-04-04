import { loadEnv } from "../config/env.js";
import { getDb } from "../lib/db.js";
import {
	createStarterPortfolio,
	updatePortfolioByUserId,
} from "../services/portfolio.service.js";
import {
	getOrCreateResumeByUserId,
	updateResumeByUserId,
} from "../services/resume.service.js";
import {
	createUser,
	getUserByEmail,
	getUserByUsername,
} from "../services/user.service.js";
import type {
	CustomSection,
	EditablePortfolio,
	ExperienceItem,
	ProjectItem,
	TechCategory,
	TimelineItem,
} from "../../shared/types/portfolio.types.js";
import type { ResumeRecord } from "../../shared/types/resume.types.js";
import { defaultPortfolioLayout } from "../../shared/defaults/portfolio.js";
import { defaultResumeLayout } from "../../shared/defaults/resume.js";
import { validateResume } from "../../shared/lib/resume.js";

const makeId = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

const withIdsTimeline = (items: Omit<TimelineItem, "id">[]): TimelineItem[] =>
	items.map((item) => ({
		...item,
		id: `${makeId(item.year)}-${makeId(item.position)}`,
	}));

const withIdsExperiences = (
	items: Omit<ExperienceItem, "id">[],
): ExperienceItem[] =>
	items.map((item) => ({
		...item,
		id: `${makeId(item.role)}-${makeId(item.company)}`,
	}));

const withIdsProjects = (items: Omit<ProjectItem, "id">[]): ProjectItem[] =>
	items.map((item) => ({
		...item,
		id: makeId(item.name),
	}));

const withIdsCategories = (
	items: Omit<TechCategory, "id">[],
): TechCategory[] =>
	items.map((item) => ({
		...item,
		id: makeId(item.name),
	}));

const ensureUser = async (input: {
	email: string;
	username: string;
	fullName: string;
	password: string;
}) => {
	const existing =
		(await getUserByEmail(input.email)) ??
		(await getUserByUsername(input.username));

	if (existing) {
		return {
			id: existing.id,
			email: existing.email,
			username: existing.username,
			fullName: existing.full_name,
			created: false,
		};
	}

	const user = await createUser(input);
	await createStarterPortfolio(user);

	return { ...user, created: true };
};

const buildSamplePortfolio = (user: {
	username: string;
	email: string;
	fullName: string;
}): EditablePortfolio => {
	const avatarUrl = "/default-avatar.svg";
	const coverUrl = "/default-cover.svg";

	const customSections: CustomSection[] = [
		{
			id: "focus",
			title: "Focus Areas",
			type: "bullets",
			body: "",
			items: [
				"Product-minded engineering: pick the smallest reliable solution, ship it, measure it, then iterate.",
				"Performance + UX: fast pages, accessible UI, and predictable states (no mystery spinners).",
				"Maintainability: clear boundaries, boring architecture, and tests that prevent regressions.",
				"DX improvements: scripts, tooling, and conventions that help teams move faster with fewer bugs.",
			],
			links: [],
		},
		{
			id: "writing",
			title: "Writing & Talks",
			type: "links",
			body: "I write short internal guides and run brown-bag sessions to help teams align on practical patterns.",
			items: [],
			links: [
				{
					id: "talk-observability",
					label: "Talk: Practical Observability for Small Teams",
					url: "https://example.com/talks/observability",
				},
				{
					id: "post-db-migrations",
					label: "Post: Zero-downtime DB migrations checklist",
					url: "https://example.com/posts/zero-downtime-migrations",
				},
			],
		},
	];

	return {
		username: user.username,
		email: user.email,
		fullName: user.fullName,
		headline:
			"Senior Staff Full-Stack Engineer (Laravel, React, Node) · Product, Platform, and Reliability",
		location: "Seattle, WA (Remote-first, US/PH overlap)",
		experienceSummary:
			"10+ years building high-scale SaaS products and internal platforms. Deep in architecture, platform reliability, data design, and delivery leadership.",
		education:
			"BS Computer Science · Distributed Systems & HCI · Ongoing executive coursework in engineering leadership",
		availability:
			"Open to senior/staff IC roles and technical leadership roles focused on platform modernization, AI-enabled workflows, and distributed product teams.",
		phone: "+1 (206) 555-0198",
		avatarUrl,
		coverUrl,
		githubUrl: "https://github.com/averykim-dev",
		githubUsername: "averykim-dev",
		linkedinUrl: "https://www.linkedin.com/in/avery-kim-dev/",
		about: [
			"I lead cross-functional product engineering from concept to production, balancing speed with maintainability. My default approach is to reduce complexity first: clear domain boundaries, explicit contracts, and observability baked in from day one.",
			"I have built and modernized large-scale systems across Laravel, React, Node.js, and MySQL/Postgres ecosystems, including ticketing platforms, customer portals, automation workflows, and high-volume API integrations. I consistently focus on measurable outcomes: faster cycle time, lower incident rates, and better customer retention.",
			"I mentor engineers across seniority levels, run architecture reviews, and help teams adopt practical standards for quality, performance, and security. I care deeply about clean systems that are easy to operate under real production pressure.",
			"I am especially effective where product ambiguity is high and execution pressure is real. I can align stakeholders, break down complex initiatives, and ship incremental value without sacrificing long-term technical health.",
		],
		timeline: withIdsTimeline([
			{
				year: "2026",
				position: "Staff Full-Stack Engineer",
				company: "Northbridge Cloud",
				note: "Owned platform architecture, reliability programs, and delivery standards across product squads.",
			},
			{
				year: "2024",
				position: "Senior Full-Stack Engineer",
				company: "Northbridge Cloud",
				note: "Led core product initiatives, standardized service contracts, and reduced release friction.",
			},
			{
				year: "2022",
				position: "Senior Software Engineer",
				company: "Brightside Commerce",
				note: "Led frontend platform evolution and API modernization for enterprise retail clients.",
			},
			{
				year: "2020",
				position: "Software Engineer",
				company: "Apex Systems",
				note: "Built full-stack SaaS modules, integrations, and internal productivity tooling.",
			},
			{
				year: "2016",
				position: "Junior Web Developer",
				company: "Freelance / Agency",
				note: "Started delivering production websites and custom business tooling.",
			},
		]),
		experiences: withIdsExperiences([
			{
				role: "Staff Full-Stack Engineer",
				company: "Northbridge Cloud",
				period: "Jan 2026 — Present",
				highlights: [
					"Architected and led a multi-quarter platform modernization initiative across 12 services, reducing cross-service incident frequency by 52% and cutting on-call escalation time from 38 minutes to 14 minutes.",
					"Introduced an end-to-end reliability framework (SLOs, error budgets, service health dashboards, and ownership runbooks) that improved production change confidence and reduced rollback rates by 41%.",
					"Led design and rollout of an event-driven integration layer supporting 20M+ monthly events with idempotency guardrails, retry policies, and tenant-level isolation.",
					"Partnered with product, security, and operations leaders to prioritize platform investments, aligning roadmap scope with customer impact and measurable business outcomes.",
					"Mentored senior engineers into tech-lead responsibilities, created an architecture review playbook, and raised delivery consistency across distributed teams.",
				],
			},
			{
				role: "Senior Full-Stack Engineer",
				company: "Northbridge Cloud",
				period: "Apr 2024 — Dec 2025",
				highlights: [
					"Owned a critical customer onboarding platform rebuild that improved activation completion from 63% to 81% and reduced support escalations by 34%.",
					"Shipped a resilient background processing system for imports and vendor syncs with queue partitioning, dead-letter handling, and operational replay tooling.",
					"Refactored legacy monolith workflows into maintainable domain services and API contracts, reducing average PR review cycles and post-release regressions.",
					"Built observability-first release workflows with deploy health checks and progressive rollout gates, improving release stability during peak traffic windows.",
					"Implemented billing lifecycle hardening across upgrades, downgrades, and payment failures with comprehensive test coverage for edge cases.",
				],
			},
			{
				role: "Senior Software Engineer",
				company: "Brightside Commerce",
				period: "Jan 2022 — Mar 2024",
				highlights: [
					"Led frontend platform redesign with shared component architecture, accessibility defaults, and design token adoption across 5 product teams.",
					"Improved Core Web Vitals and checkout performance through bundle strategy optimization, route-level code splitting, and render pipeline tuning.",
					"Established typed API client patterns and error-handling standards, reducing frontend defects tied to integration mismatches by 47%.",
					"Collaborated with backend teams to redesign high-traffic endpoints and reduce payload complexity for major customer-facing workflows.",
				],
			},
			{
				role: "Software Engineer",
				company: "Apex Systems",
				period: "Jul 2018 — Dec 2021",
				highlights: [
					"Delivered core B2B SaaS modules, internal analytics tools, and partner API integrations supporting finance and operations teams.",
					"Built secure role-based admin workflows, workflow automation features, and reporting dashboards used by 1,000+ internal users.",
					"Contributed to CI/CD maturity, API validation standards, and migration playbooks that improved deployment confidence and engineering throughput.",
				],
			},
			{
				role: "Junior Web Developer",
				company: "Freelance / Agency",
				period: "Jan 2016 — Jun 2018",
				highlights: [
					"Delivered responsive marketing sites, lightweight web apps, and CMS implementations for SMB clients.",
					"Built practical admin interfaces and business automations that reduced repetitive manual work for operations teams.",
					"Developed strong fundamentals in UI engineering, backend integration, and production support.",
				],
			},
		]),
		techCategories: withIdsCategories([
			{
				name: "Frontend",
				items: [
					"React",
					"TypeScript",
					"Vite",
					"Tailwind CSS",
					"shadcn/ui",
					"React Query",
					"React Router",
					"Accessibility (WCAG basics)",
					"Performance (Core Web Vitals)",
				],
			},
			{
				name: "Backend",
				items: [
					"Node.js",
					"Express",
					"REST API design",
					"Auth (JWT, cookies)",
					"MySQL",
					"SQL schema design",
					"Background jobs / queues",
					"File uploads",
					"Rate limiting",
				],
			},
			{
				name: "Quality",
				items: [
					"Unit tests",
					"Integration tests",
					"Contract-ish API testing",
					"CI pipelines",
					"Code review practices",
					"Linting + formatting",
				],
			},
			{
				name: "DevOps & Tools",
				items: [
					"Git + GitHub",
					"Docker (local dev + CI)",
					"Vercel",
					"Linux basics",
					"NGINX basics",
					"Postman",
					"Observability (logs, metrics, traces)",
				],
			},
		]),
		projects: withIdsProjects([
			{
				name: "Enterprise Service Desk Platform",
				description:
					"Designed and delivered a multi-tenant ticketing and workflow platform with SLA automation, role-based access, and deep third-party integrations for enterprise support operations.",
				url: "https://example.com/projects/service-desk-platform",
			},
			{
				name: "Developer Platform Reliability Program",
				description:
					"Built SLO tooling, incident dashboards, and operational runbooks that standardized reliability ownership and reduced Sev-1 recurrence.",
				url: "https://example.com/projects/reliability-program",
			},
			{
				name: "Customer Onboarding Experience Revamp",
				description:
					"Rebuilt onboarding UX and backend orchestration to improve activation rate and reduce time-to-value for new enterprise customers.",
				url: "https://example.com/projects/onboarding-revamp",
			},
			{
				name: "Event-Driven Integration Hub",
				description:
					"Implemented a resilient event pipeline with retries, idempotency, and observability for high-volume vendor and product integrations.",
				url: "https://example.com/projects/integration-hub",
			},
		]),
		customSections,
		layout: { ...defaultPortfolioLayout },
		chatEnabled: true,
		geminiApiKey: "",
		hasCustomGeminiKey: false,
	};
};

const buildSampleResume = (user: {
	username: string;
	email: string;
	fullName: string;
}): ResumeRecord => ({
	templateKey: "ats_classic_v1",
	content: {
		header: {
			fullName: user.fullName,
			headline: "Senior Full-Stack Engineer",
			location: "Seattle, WA",
			email: user.email,
			phone: "+1 (206) 555-0198",
			websiteUrl: `https://${user.username}.dev`,
			linkedinUrl: "https://www.linkedin.com/in/avery-kim-dev/",
			githubUrl: "https://github.com/averykim-dev",
		},
		summary:
			"Senior full-stack engineer focused on reliable product delivery. I build maintainable Laravel and React systems, improve release confidence through observability, and ship measurable user-impact improvements with cross-functional teams.",
		experience: [
			{
				id: "exp-staff-northbridge",
				role: "Staff Full-Stack Engineer",
				company: "Northbridge Cloud",
				location: "Seattle, WA",
				startDate: "Jan 2026",
				endDate: "Present",
				isCurrent: true,
				bullets: [
					"Led platform modernization across core services and reduced production incidents by 52% in one year.",
					"Introduced SLO dashboards and runbooks that improved on-call response speed and release confidence.",
					"Partnered with product and operations leaders to prioritize platform investments with clear business outcomes.",
				],
			},
			{
				id: "exp-senior-northbridge",
				role: "Senior Full-Stack Engineer",
				company: "Northbridge Cloud",
				location: "Seattle, WA",
				startDate: "Apr 2024",
				endDate: "Dec 2025",
				isCurrent: false,
				bullets: [
					"Rebuilt onboarding flows and increased activation completion while reducing support escalation volume.",
					"Implemented resilient background processing with retries, dead-letter handling, and replay tooling.",
					"Refactored legacy workflows into stable domain services and lowered regression rates after releases.",
				],
			},
			{
				id: "exp-senior-brightside",
				role: "Senior Software Engineer",
				company: "Brightside Commerce",
				location: "Remote",
				startDate: "Jan 2022",
				endDate: "Mar 2024",
				isCurrent: false,
				bullets: [
					"Shipped shared frontend architecture with design tokens and accessibility defaults across product teams.",
					"Improved checkout performance by optimizing bundle strategy and route-level code splitting.",
					"Standardized typed API contracts and reduced client integration defects in critical workflows.",
				],
			},
			{
				id: "exp-apex",
				role: "Software Engineer",
				company: "Apex Systems",
				location: "Seattle, WA",
				startDate: "Jul 2018",
				endDate: "Dec 2021",
				isCurrent: false,
				bullets: [
					"Built SaaS modules, admin workflows, and partner integrations used by operations teams daily.",
					"Delivered secure role-based interfaces for internal tools and reporting dashboards.",
					"Contributed to CI improvements and migration checklists that increased deployment reliability.",
				],
			},
		],
		education: [
			{
				id: "edu-uw",
				school: "University of Washington",
				degree: "BS Computer Science",
				location: "Seattle, WA",
				graduationDate: "2018",
				details: [],
			},
		],
		skills: [
			"Laravel",
			"PHP",
			"React",
			"TypeScript",
			"Node.js",
			"Express",
			"MySQL",
			"PostgreSQL",
			"Tailwind CSS",
			"REST API Design",
			"React Query",
			"Docker",
			"GitHub Actions",
			"Observability",
		],
		projects: [
			{
				id: "proj-service-desk",
				name: "Enterprise Service Desk Platform",
				description:
					"Multi-tenant ticketing and workflow platform with SLA automation and role-based controls.",
				url: "https://example.com/projects/service-desk-platform",
				highlights: [],
			},
			{
				id: "proj-reliability",
				name: "Developer Platform Reliability Program",
				description:
					"SLO tooling and operational dashboards that reduced high-severity incident recurrence.",
				url: "https://example.com/projects/reliability-program",
				highlights: [],
			},
			{
				id: "proj-onboarding",
				name: "Customer Onboarding Revamp",
				description:
					"Onboarding experience and backend orchestration redesign to improve activation completion.",
				url: "https://example.com/projects/onboarding-revamp",
				highlights: [],
			},
		],
		certifications: [],
		awards: [],
		volunteer: [],
		languages: [],
		publications: [],
		custom: [],
	},
	layout: {
		...defaultResumeLayout,
		sectionOrder: [...defaultResumeLayout.sectionOrder],
		visibility: { ...defaultResumeLayout.visibility },
		positions: {},
	},
});

const main = async () => {
	loadEnv();

	const seedUser = await ensureUser({
		email: "morgan.reyes@example.com",
		username: "morganreyes",
		fullName: "Morgan Reyes",
		password: "SeniorDev123!",
	});

	const sample = buildSamplePortfolio(seedUser);
	await updatePortfolioByUserId(seedUser.id, sample);

	await getOrCreateResumeByUserId(seedUser.id);
	const seededResume = buildSampleResume(seedUser);
	const updatedResume = await updateResumeByUserId(seedUser.id, seededResume);
	const validation = updatedResume ? validateResume(updatedResume) : validateResume(seededResume);

	console.log(
		[
			seedUser.created ? "Seeded new sample user." : "Updated existing sample user.",
			`email=${seedUser.email}`,
			`username=${seedUser.username}`,
			`password=SeniorDev123!`,
			`resume_warnings=${validation.warnings.length}`,
			`resume_errors=${validation.errors.length}`,
		].join("\n"),
	);

	await getDb().end();
};

main().catch(async (err) => {
	console.error(err);
	try {
		await getDb().end();
	} catch {
		// ignore
	}
	process.exitCode = 1;
});
