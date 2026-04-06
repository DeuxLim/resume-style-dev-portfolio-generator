import type {
	CustomSection,
	EditablePortfolio,
	ExperienceItem,
	HeaderAction,
	ProjectItem,
	TechCategory,
	TimelineItem,
} from "../../../shared/types/portfolio.types";
import { defaultPortfolioLayout } from "../../../shared/defaults/portfolio";

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
	type: "text",
	body: "",
	items: [""],
	links: [{ id: makeId(), label: "", url: "" }],
});

export const createHeaderAction = (): HeaderAction => ({
	id: makeId(),
	label: "",
	type: "link",
	value: "",
	display: "label",
});

export const cloneEditablePortfolio = (
	portfolio: EditablePortfolio,
): EditablePortfolio => ({
	...portfolio,
	layout: {
		sectionOrder:
			portfolio.layout?.sectionOrder?.length
				? [...portfolio.layout.sectionOrder]
				: [...defaultPortfolioLayout.sectionOrder],
		sectionSpans: {
			...defaultPortfolioLayout.sectionSpans,
			...(portfolio.layout?.sectionSpans ?? {}),
		},
		sectionHeights: {
			...defaultPortfolioLayout.sectionHeights,
			...(portfolio.layout?.sectionHeights ?? {}),
		},
	},
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
	customSections: portfolio.customSections.map((item) => ({
		...item,
		type: item.type ?? "text",
		body: item.body ?? "",
		items: Array.isArray(item.items) ? [...item.items] : [""],
		links: Array.isArray(item.links)
			? item.links.map((link) => ({ ...link }))
			: [],
	})),
	headerActions: Array.isArray(portfolio.headerActions)
		? portfolio.headerActions.map((action) => ({
				...action,
				display: action.display === "value" ? "value" : "label",
			}))
		: [],
});

export const ensureHref = (value: string) => {
	if (!value) {
		return "";
	}

	return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};
