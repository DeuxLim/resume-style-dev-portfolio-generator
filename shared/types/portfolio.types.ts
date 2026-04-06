export type TimelineItem = {
	id: string;
	year: string;
	position: string;
	company: string;
	note: string;
};

export type ExperienceItem = {
	id: string;
	role: string;
	company: string;
	period: string;
	highlights: string[];
};

export type ProjectItem = {
	id: string;
	name: string;
	description: string;
	url: string;
};

export type TechCategory = {
	id: string;
	name: string;
	items: string[];
};

export type CustomSection = {
	id: string;
	title: string;
	type: "text" | "bullets" | "links";
	body: string;
	items: string[];
	links: { id: string; label: string; url: string }[];
};

export type HeaderActionType =
	| "github"
	| "linkedin"
	| "email"
	| "phone"
	| "link";

export type HeaderAction = {
	id: string;
	label: string;
	type: HeaderActionType;
	value: string;
	display: "label" | "value";
};

export type PortfolioSectionKey =
	| "about"
	| "timeline"
	| "experience"
	| "tech"
	| "projects"
	| "heatmap"
	| "custom";

export type PortfolioSectionSpan = 4 | 6 | 8 | 12;

export type PortfolioLayout = {
	sectionOrder: PortfolioSectionKey[];
	sectionSpans: Partial<Record<PortfolioSectionKey, PortfolioSectionSpan>>;
	sectionHeights: Partial<Record<PortfolioSectionKey, number>>;
};

export type PortfolioRecord = {
	username: string;
	fullName: string;
	headline: string;
	location: string;
	experienceSummary: string;
	education: string;
	availability: string;
	email: string;
	phone: string;
	avatarUrl: string;
	coverUrl: string;
	githubUrl: string;
	githubUsername: string;
	linkedinUrl: string;
	headerActions: HeaderAction[];
	about: string[];
	timeline: TimelineItem[];
	experiences: ExperienceItem[];
	techCategories: TechCategory[];
	projects: ProjectItem[];
	customSections: CustomSection[];
	layout: PortfolioLayout;
	chatEnabled: boolean;
};

export type PublicPortfolio = PortfolioRecord & {
	createdAt?: string;
	updatedAt?: string;
};

export type EditablePortfolio = PublicPortfolio & {
	geminiApiKey: string;
	hasCustomGeminiKey: boolean;
};

export type SessionUser = {
	id: number;
	email: string;
	username: string;
	fullName: string;
};

export type PortfolioVersionSummary = {
	id: number;
	name: string;
	isActive: boolean;
	createdAt?: string;
	updatedAt?: string;
};

export type PortfolioVersionDetail = {
	version: PortfolioVersionSummary;
	portfolio: EditablePortfolio;
};

export type PortfolioVersionBase = "latest" | "live" | "blank";
