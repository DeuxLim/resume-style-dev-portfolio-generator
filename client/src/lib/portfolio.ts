import type {
	CustomSection,
	EditablePortfolio,
	ExperienceItem,
	ProjectItem,
	TechCategory,
	TimelineItem,
} from "../../../shared/types/portfolio.types";

const makeId = () =>
	typeof crypto !== "undefined" && "randomUUID" in crypto
		? crypto.randomUUID()
		: `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createTimelineItem = (): TimelineItem => ({
	id: makeId(),
	year: "",
	position: "",
	company: "",
	note: "",
});

export const createExperienceItem = (): ExperienceItem => ({
	id: makeId(),
	role: "",
	company: "",
	period: "",
	highlights: [""],
});

export const createProjectItem = (): ProjectItem => ({
	id: makeId(),
	name: "",
	description: "",
	url: "",
});

export const createTechCategory = (): TechCategory => ({
	id: makeId(),
	name: "",
	items: [],
});

export const createCustomSection = (): CustomSection => ({
	id: makeId(),
	title: "",
	body: "",
});

export const cloneEditablePortfolio = (
	portfolio: EditablePortfolio,
): EditablePortfolio => ({
	...portfolio,
	about: [...portfolio.about],
	timeline: portfolio.timeline.map((item) => ({ ...item })),
	experiences: portfolio.experiences.map((item) => ({
		...item,
		highlights: [...item.highlights],
	})),
	techCategories: portfolio.techCategories.map((item) => ({
		...item,
		items: [...item.items],
	})),
	projects: portfolio.projects.map((item) => ({ ...item })),
	customSections: portfolio.customSections.map((item) => ({ ...item })),
});

export const ensureHref = (value: string) => {
	if (!value) {
		return "";
	}

	return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};
