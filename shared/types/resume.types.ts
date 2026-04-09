export type ResumeTemplateKey =
	| "ats_classic_v1"
	| "harvard_classic_v1"
	| "deux_modern_v1";

export type ResumeSectionKey =
	| "header"
	| "summary"
	| "experience"
	| "education"
	| "skills"
	| "projects"
	| "certifications"
	| "awards"
	| "volunteer"
	| "languages"
	| "publications"
	| "custom";

export type ResumeSectionKind = "mandatory" | "important" | "optional";

export type ResumeHeader = {
	fullName: string;
	headline: string;
	location: string;
	email: string;
	phone: string;
	websiteUrl: string;
	linkedinUrl: string;
	githubUrl: string;
};

export type ResumeExperienceItem = {
	id: string;
	role: string;
	company: string;
	location: string;
	startDate: string;
	endDate: string;
	isCurrent: boolean;
	bullets: string[];
};

export type ResumeEducationItem = {
	id: string;
	school: string;
	degree: string;
	location: string;
	graduationDate: string;
	details: string[];
};

export type ResumeProjectItem = {
	id: string;
	name: string;
	description: string;
	url: string;
	highlights: string[];
};

export type ResumeStructuredListItem = {
	id: string;
	title: string;
	subtitle: string;
	date: string;
	location: string;
	details: string[];
	url: string;
};

export type ResumeContent = {
	header: ResumeHeader;
	summary: string;
	experience: ResumeExperienceItem[];
	education: ResumeEducationItem[];
	skills: string[];
	projects: ResumeProjectItem[];
	certifications: ResumeStructuredListItem[];
	awards: ResumeStructuredListItem[];
	volunteer: ResumeStructuredListItem[];
	languages: string[];
	publications: ResumeStructuredListItem[];
	custom: ResumeStructuredListItem[];
};

export type ResumeLayout = {
	mode: "default" | "manual";
	sectionOrder: ResumeSectionKey[];
	visibility: Partial<Record<ResumeSectionKey, boolean>>;
	positions: Partial<Record<ResumeSectionKey, number>>;
};

export type ResumeRecord = {
	templateKey: ResumeTemplateKey;
	content: ResumeContent;
	layout: ResumeLayout;
	createdAt?: string;
	updatedAt?: string;
};

export type ResumeValidationLevel = "warning" | "error";

export type ResumeValidationIssue = {
	level: ResumeValidationLevel;
	code: string;
	section: ResumeSectionKey | "global";
	message: string;
};

export type ResumeValidationResult = {
	warnings: ResumeValidationIssue[];
	errors: ResumeValidationIssue[];
	estimatedPages: number;
	canExportPdf: boolean;
};

export type ResumeVersionSummary = {
	id: number;
	name: string;
	isActive: boolean;
	createdAt?: string;
	updatedAt?: string;
};

export type ResumeVersionDetail = {
	version: ResumeVersionSummary;
	resume: ResumeRecord;
};

export type ResumeVersionBase = "latest" | "live" | "blank";
