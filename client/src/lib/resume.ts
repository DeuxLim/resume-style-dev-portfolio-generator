import {
	defaultResumeLayout,
	defaultResumeSectionOrder,
	defaultResumeVisibility,
} from "../../../shared/defaults/resume";
import { groupResumeSkills, validateResume } from "../../../shared/lib/resume";
import type {
	ResumeRecord,
	ResumeSectionKey,
	ResumeStructuredListItem,
} from "../../../shared/types/resume.types";

const makeId = () =>
	typeof crypto !== "undefined" && "randomUUID" in crypto
		? crypto.randomUUID()
		: `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createResumeListItem = (): ResumeStructuredListItem => ({
	id: makeId(),
	title: "",
	subtitle: "",
	date: "",
	location: "",
	details: [""],
	url: "",
});

export const cloneResume = (resume: ResumeRecord): ResumeRecord => ({
	templateKey:
		resume.templateKey === "harvard_classic_v1" ||
		resume.templateKey === "deux_modern_v1"
			? resume.templateKey
			: "ats_classic_v1",
	content: {
		header: { ...resume.content.header },
		summary: resume.content.summary,
		experience: resume.content.experience.map((item) => ({
			...item,
			bullets: [...item.bullets],
		})),
		education: resume.content.education.map((item) => ({
			...item,
			details: [...item.details],
		})),
		skills: [...resume.content.skills],
		projects: resume.content.projects.map((item) => ({
			...item,
			highlights: [...item.highlights],
		})),
		certifications: resume.content.certifications.map((item) => ({
			...item,
			details: [...item.details],
		})),
		awards: resume.content.awards.map((item) => ({
			...item,
			details: [...item.details],
		})),
		volunteer: resume.content.volunteer.map((item) => ({
			...item,
			details: [...item.details],
		})),
		languages: [...resume.content.languages],
		publications: resume.content.publications.map((item) => ({
			...item,
			details: [...item.details],
		})),
		custom: resume.content.custom.map((item) => ({
			...item,
			details: [...item.details],
		})),
	},
	layout: {
		mode: resume.layout?.mode === "manual" ? "manual" : "default",
		sectionOrder: resume.layout?.sectionOrder?.length
			? [...resume.layout.sectionOrder]
			: [...defaultResumeSectionOrder],
		visibility: {
			...defaultResumeVisibility,
			...(resume.layout?.visibility ?? {}),
		},
		positions: {
			...(resume.layout?.positions ?? {}),
		},
	},
	createdAt: resume.createdAt,
	updatedAt: resume.updatedAt,
});

export const resetResumeLayout = (resume: ResumeRecord): ResumeRecord => ({
	...resume,
	layout: {
		...defaultResumeLayout,
		sectionOrder: [...defaultResumeLayout.sectionOrder],
		visibility: { ...defaultResumeLayout.visibility },
		positions: {},
	},
});

export const moveSection = (
	order: ResumeSectionKey[],
	section: ResumeSectionKey,
	direction: "up" | "down",
) => {
	const index = order.indexOf(section);
	if (index === -1) return order;
	const delta = direction === "up" ? -1 : 1;
	const nextIndex = index + delta;
	if (nextIndex < 0 || nextIndex >= order.length) return order;
	const next = [...order];
	next[index] = order[nextIndex];
	next[nextIndex] = order[index];
	return next;
};

export const getResumeValidation = (resume: ResumeRecord) => validateResume(resume);
export { groupResumeSkills };

export const resumeSections: Array<{
	key: ResumeSectionKey;
	title: string;
	kind: "mandatory" | "important" | "optional";
}> = [
	{ key: "header", title: "Header", kind: "mandatory" },
	{ key: "summary", title: "Summary", kind: "important" },
	{ key: "experience", title: "Experience", kind: "mandatory" },
	{ key: "education", title: "Education", kind: "mandatory" },
	{ key: "skills", title: "Skills", kind: "mandatory" },
	{ key: "projects", title: "Projects", kind: "important" },
	{ key: "certifications", title: "Certifications", kind: "optional" },
	{ key: "awards", title: "Awards", kind: "optional" },
	{ key: "volunteer", title: "Volunteer", kind: "optional" },
	{ key: "languages", title: "Languages", kind: "optional" },
	{ key: "publications", title: "Publications", kind: "optional" },
	{ key: "custom", title: "Custom", kind: "optional" },
];
