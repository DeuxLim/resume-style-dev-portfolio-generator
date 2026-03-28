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
	body: string;
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
	about: string[];
	timeline: TimelineItem[];
	experiences: ExperienceItem[];
	techCategories: TechCategory[];
	projects: ProjectItem[];
	customSections: CustomSection[];
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
