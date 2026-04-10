import {
	useEffect,
	useMemo,
	useRef,
	useState,
	type ChangeEvent,
	type PointerEvent as ReactPointerEvent,
} from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiBaseUrl } from "@/lib/axios.client";
import type { AxiosError } from "axios";
import { useSession } from "@/hooks/useSession";
import { usePinnedSidebar } from "@/hooks/usePinnedSidebar";
import { buildStarterResume } from "../../../shared/defaults/resume";
import {
	cloneResume,
	createResumeListItem,
	groupResumeSkills,
	moveSection,
	resetResumeLayout,
	resumeSections,
} from "@/lib/resume";
import type {
	ResumeDynamicSection,
	ResumeDynamicSectionHeaderMode,
	ResumeRecord,
	ResumeSectionKey,
	ResumeStructuredListItem,
	ResumeTemplateKey,
	ResumeValidationResult,
	ResumeVersionBase,
	ResumeVersionDetail,
	ResumeVersionSummary,
} from "../../../shared/types/resume.types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
	ArrowDown,
	ArrowUp,
	Download,
	Eye,
	EyeOff,
	MoreHorizontal,
	Pencil,
	Save,
	Shuffle,
	Trash2,
} from "lucide-react";

const sectionTitleByKey: Record<ResumeSectionKey, string> = {
	header: "Header",
	summary: "Summary",
	experience: "Experience",
	education: "Education",
	skills: "Skills",
	projects: "Projects",
	certifications: "Certifications",
	awards: "Awards",
	volunteer: "Volunteer",
	languages: "Languages",
	publications: "Publications",
	custom: "Custom",
};

const listSections: Array<{
	key: "certifications" | "awards" | "volunteer" | "publications";
	title: string;
}> = [
	{ key: "certifications", title: "Certifications" },
	{ key: "awards", title: "Awards" },
	{ key: "volunteer", title: "Volunteer" },
	{ key: "publications", title: "Publications" },
];

const resumeTemplateOptions: Array<{ key: ResumeTemplateKey; label: string }> = [
	{ key: "deux_modern_v1", label: "Modern ATS" },
];

const versionBaseOptions: Array<{
	value: ResumeVersionBase;
	label: string;
	description: string;
}> = [
	{
		value: "latest",
		label: "Most recent",
		description: "Start from the latest updated version snapshot.",
	},
	{
		value: "live",
		label: "Current live",
		description: "Start from what visitors currently see.",
	},
	{
		value: "blank",
		label: "Clean slate",
		description: "Start with empty content fields.",
	},
];

const makeId = () =>
	typeof crypto !== "undefined" && "randomUUID" in crypto
		? crypto.randomUUID()
		: `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const editorCardClassName = "v2-panel shadow-none";
const contentSectionCardClassName = `${editorCardClassName} min-w-0 scroll-mt-28`;
const itemBlockClassName = "min-w-0 space-y-2 rounded-2xl border border-border/70 bg-muted/35 p-4";
const FLOATING_PREVIEW_MIN_OFFSET = 8;
const FLOATING_PREVIEW_MIN_TOP = 96;
const FLOATING_PREVIEW_COLLAPSED_WIDTH = 288;
const FLOATING_PREVIEW_COLLAPSED_HEIGHT = 260;
type StructuredSectionKey = (typeof listSections)[number]["key"];
type ResumeCreateModalKind =
	| "experience"
	| "education"
	| "project"
	| "structured"
	| "custom";
type ResumeCreateModalState = {
	kind: ResumeCreateModalKind;
	title: string;
	subtitle: string;
	sectionKey?: StructuredSectionKey;
	submitLabel: string;
	lockSectionTitle?: boolean;
};
type CreateModalCategoryRow = {
	id: string;
	category: string;
	valuesText: string;
};
type ResumeCreateFormState = {
	sectionTitle: string;
	headerMode: ResumeDynamicSectionHeaderMode;
	showSubheader: boolean;
	leftHeader: string;
	rightHeader: string;
	leftSubheader: string;
	rightSubheader: string;
	bodyMode: "text" | "bullets" | "categories";
	text: string;
	bulletsText: string;
	categories: CreateModalCategoryRow[];
};
type SkillCategoryDraft = {
	id: string;
	category: string;
	skillsText: string;
};
const makeCreateFormDefaults = (): ResumeCreateFormState => ({
	sectionTitle: "",
	headerMode: "split",
	showSubheader: true,
	leftHeader: "",
	rightHeader: "",
	leftSubheader: "",
	rightSubheader: "",
	bodyMode: "bullets",
	text: "",
	bulletsText: "",
	categories: [{ id: makeId(), category: "", valuesText: "" }],
});
const parseTextareaLines = (value: string) =>
	value
		.split("\n")
		.map((entry) => entry.trim())
		.filter(Boolean);

const MAX_HEADER_CONTACT_ITEMS = 3;
const MAX_HEADER_LINK_ITEMS = 3;
const MAX_CUSTOM_SECTION_BULLETS = 12;
const HEADER_CONTACT_PLACEHOLDERS = [
	"sample@email.com",
	"+63 912 345 6789",
	"Quezon City, Philippines",
];
const HEADER_LINK_PLACEHOLDERS = [
	"https://linkedin.com/in/yourname",
	"https://github.com/yourname",
	"https://yourname.dev",
];

const parseCommaValues = (value: string) =>
	value
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);

const getCreateModalLabels = (kind: ResumeCreateModalKind) => {
	switch (kind) {
		case "experience":
			return {
				leftHeader: "Company",
				rightHeader: "Location",
				leftSubheader: "Role",
				rightSubheader: "Date range (e.g. Jun 2025 - Dec 2025)",
				body: "Bullets / details",
			};
		case "education":
			return {
				leftHeader: "School",
				rightHeader: "Location",
				leftSubheader: "Degree",
				rightSubheader: "Graduation date",
				body: "Details",
			};
		case "project":
			return {
				leftHeader: "Project name",
				rightHeader: "Short description",
				leftSubheader: "Subtitle (optional)",
				rightSubheader: "Date / status (optional)",
				body: "Highlights",
			};
		case "custom":
			return {
				leftHeader: "Left header",
				rightHeader: "Right header",
				leftSubheader: "Left subheader",
				rightSubheader: "Right subheader",
				body: "Details",
			};
		case "structured":
		default:
			return {
				leftHeader: "Title",
				rightHeader: "Location",
				leftSubheader: "Subtitle",
				rightSubheader: "Date",
				body: "Details",
			};
	}
};

const parseDateRange = (value: string) => {
	const trimmed = value.trim();
	if (!trimmed) return { startDate: "", endDate: "", isCurrent: false };
	const separators = [" - ", " – ", " — ", " to "];
	for (const separator of separators) {
		if (trimmed.includes(separator)) {
			const [startRaw, endRaw] = trimmed.split(separator, 2);
			const startDate = startRaw.trim();
			const endDate = endRaw.trim();
			const isCurrent = /present|current/i.test(endDate);
			return {
				startDate,
				endDate: endDate || (isCurrent ? "Present" : ""),
				isCurrent,
			};
		}
	}
	const isCurrent = /present|current/i.test(trimmed);
	return {
		startDate: trimmed,
		endDate: isCurrent ? "Present" : "",
		isCurrent,
	};
};

const buildCreateModalBodyLines = (form: ResumeCreateFormState) => {
	if (form.bodyMode === "text") {
		return parseTextareaLines(form.text);
	}
	if (form.bodyMode === "categories") {
		return form.categories
			.map((row) => {
				const category = row.category.trim();
				const values = parseCommaValues(row.valuesText);
				if (!category && !values.length) return "";
				if (!category) return values.join(", ");
				if (!values.length) return category;
				return `${category}: ${values.join(", ")}`;
			})
			.filter(Boolean);
	}
	return parseTextareaLines(form.bulletsText);
};

const toSkillCategoryDrafts = (skills: string[]): SkillCategoryDraft[] => {
	const groups = groupResumeSkills(skills);
	if (!groups.length) {
		return [{ id: makeId(), category: "", skillsText: "" }];
	}
	return groups.map((group) => ({
		id: makeId(),
		category: group.category,
		skillsText: group.items.join(", "),
	}));
};

const serializeSkillCategoryDrafts = (drafts: SkillCategoryDraft[]) => {
	const values: string[] = [];
	for (const draft of drafts) {
		const category = draft.category.trim();
		const items = draft.skillsText
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);
		if (!items.length) continue;
		if (category) {
			values.push(`${category}: ${items.join(", ")}`);
			continue;
		}
		values.push(...items);
	}
	return values;
};

const buildGuestResume = (): ResumeRecord => {
	const starter = buildStarterResume({
		fullName: "",
		email: "",
		location: "",
		headline: "",
	});
	return {
		...starter,
		content: {
			...starter.content,
			header: {
				...starter.content.header,
				fullName: "Your Full Name",
				headline: "Your Role (e.g., Full Stack Developer)",
				location: "",
				email: "sample@email.com",
				contactItems: ["", "", ""],
				linkItems: ["", ""],
			},
			summary: "Write a short summary of your strongest skills and impact.",
			experience: [
				{
					id: makeId(),
					role: "",
					company: "",
					location: "",
					startDate: "",
					endDate: "",
					isCurrent: false,
					bullets: [""],
				},
			],
			education: [
				{
					id: makeId(),
					school: "",
					degree: "",
					location: "",
					graduationDate: "",
					details: [""],
				},
			],
			skills: [],
			projects: [
				{
					id: makeId(),
					name: "",
					description: "",
					url: "",
					highlights: [""],
				},
			],
			certifications: [],
			awards: [],
			volunteer: [],
			languages: [],
			publications: [],
			custom: [],
			customSections: [],
		},
	};
};

export default function ResumeBuilderPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const queryClient = useQueryClient();
	const sessionQuery = useSession();
	const isAuthed = Boolean(sessionQuery.data?.user);
	const isGuestRoute = location.pathname.startsWith("/resume");
	const isGuestMode = isGuestRoute || (sessionQuery.isSuccess && !sessionQuery.data?.user);
	const selectedVersionId = Number(searchParams.get("versionId"));
	const hasSelectedVersionId =
		Number.isFinite(selectedVersionId) && selectedVersionId > 0;
	const draftMode = searchParams.get("draft") === "1" && !hasSelectedVersionId;
	const draftBaseInput = String(searchParams.get("base") ?? "latest").toLowerCase();
	const draftBase: ResumeVersionBase =
		draftBaseInput === "blank" || draftBaseInput === "live" || draftBaseInput === "latest"
			? draftBaseInput
			: "latest";
	const draftName = String(searchParams.get("name") ?? "").trim();
	const openedFromDashboardPreview = searchParams.get("preview") === "1";
	const [resume, setResume] = useState<ResumeRecord | null>(null);
	const [toast, setToast] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);
	const [activeTab, setActiveTab] = useState("content");
	const [previewOpen, setPreviewOpen] = useState(() => openedFromDashboardPreview);
	const [pdfPreviewNonce, setPdfPreviewNonce] = useState(0);
	const [guestPdfPreviewUrl, setGuestPdfPreviewUrl] = useState<string>("");
	const [guestPreviewAttempted, setGuestPreviewAttempted] = useState(false);
	const [floatingPreviewPosition, setFloatingPreviewPosition] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [isFloatingPreviewDragging, setIsFloatingPreviewDragging] = useState(false);
	const [isFloatingPreviewMinimized, setIsFloatingPreviewMinimized] = useState(true);
	const [shortcutsOpen, setShortcutsOpen] = useState(false);
	const [resetLayoutDialogOpen, setResetLayoutDialogOpen] = useState(false);
	const [renameDialogOpen, setRenameDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
	const [renameValue, setRenameValue] = useState("");
	const [skillCategoryDrafts, setSkillCategoryDrafts] = useState<SkillCategoryDraft[]>([
		{ id: makeId(), category: "", skillsText: "" },
	]);
	const [languagesDraftInput, setLanguagesDraftInput] = useState("");
	const [experienceBulletsDraftById, setExperienceBulletsDraftById] = useState<
		Record<string, string>
	>({});
	const lastHydratedSkillsRef = useRef<string>("");
	const [versionToCreate, setVersionToCreate] = useState<{
		name: string;
		base: ResumeVersionBase;
		error: string;
	} | null>(null);
	const [createModal, setCreateModal] = useState<ResumeCreateModalState | null>(null);
	const [createForm, setCreateForm] = useState<ResumeCreateFormState>(() => makeCreateFormDefaults());
	const floatingPreviewDragRef = useRef<{
		pointerId: number;
		startX: number;
		startY: number;
		originX: number;
		originY: number;
	} | null>(null);
	const hydratedResumeSourceRef = useRef<string | null>(null);
	const [activeContentSection, setActiveContentSection] = useState(
		"resume-content-header",
	);
	const { shellRef: navShellRef, asideRef: navAsideRef, pinnedStyle } = usePinnedSidebar({
		enabled: activeTab === "content",
		topOffset: 96,
		minWidth: 768,
		defaultWidth: 220,
	});

	useEffect(() => {
		if (!toast) return;
		const timeoutId = window.setTimeout(() => setToast(null), 2400);
		return () => window.clearTimeout(timeoutId);
	}, [toast]);

	useEffect(() => {
		return () => {
			if (guestPdfPreviewUrl) {
				window.URL.revokeObjectURL(guestPdfPreviewUrl);
			}
		};
	}, [guestPdfPreviewUrl]);

	useEffect(() => {
		if (!isGuestMode) return;
		if (hasSelectedVersionId || draftMode) {
			navigate("/resume", { replace: true });
		}
	}, [draftMode, hasSelectedVersionId, isGuestMode, navigate]);

	const resumeQuery = useQuery({
		queryKey: ["my-resume"],
		queryFn: async () => {
			const { data } = await api.get<{ resume: ResumeRecord; validation: ResumeValidationResult }>(
				"/resumes/me",
			);
			return data;
		},
		enabled: isAuthed,
	});

	const versionsQuery = useQuery({
		queryKey: ["my-resume-versions"],
		queryFn: async () => {
			const { data } = await api.get<{ versions: ResumeVersionSummary[] }>(
				"/resumes/me/versions",
			);
			return data.versions;
		},
		enabled: isAuthed,
	});

	const versionDetailQuery = useQuery({
		queryKey: ["my-resume-version", selectedVersionId],
		queryFn: async () => {
			const { data } = await api.get<ResumeVersionDetail>(
				`/resumes/me/versions/${selectedVersionId}`,
			);
			return data;
		},
		enabled: isAuthed && hasSelectedVersionId,
	});

	const versionPreviewQuery = useQuery({
		queryKey: ["my-resume-version-preview", draftBase],
		queryFn: async () => {
			const { data } = await api.get<{ resume: ResumeRecord }>(
				`/resumes/me/versions/preview?base=${draftBase}`,
			);
			return data.resume;
		},
		enabled: isAuthed && draftMode,
	});

	const activeVersion = versionsQuery.data?.find((version) => version.isActive) ?? null;

	useEffect(() => {
		if (!versionDetailQuery.data?.version?.name) return;
		setRenameValue(versionDetailQuery.data.version.name);
	}, [versionDetailQuery.data?.version?.name]);

	useEffect(() => {
		if (!resume) return;
		const serializedResumeSkills = JSON.stringify(resume.content.skills);
		if (serializedResumeSkills !== lastHydratedSkillsRef.current) {
			lastHydratedSkillsRef.current = serializedResumeSkills;
			setSkillCategoryDrafts(toSkillCategoryDrafts(resume.content.skills));
		}
		setLanguagesDraftInput(resume.content.languages.join(", "));
	}, [resume?.content.skills, resume]);

	useEffect(() => {
		if (!resume) return;
		setExperienceBulletsDraftById((current) => {
			const next: Record<string, string> = {};
			for (const item of resume.content.experience) {
				next[item.id] = current[item.id] ?? item.bullets.join("\n");
			}
			return next;
		});
	}, [resume?.content.experience, resume]);

	useEffect(() => {
		if (isGuestMode) {
			if (!resume) {
				setResume(buildGuestResume());
			}
			return;
		}
		const sourceKey = hasSelectedVersionId
			? `version:${selectedVersionId}`
			: draftMode
				? `draft:${draftBase}:${draftName || "untitled"}`
				: "live";
		const sourceChanged = hydratedResumeSourceRef.current !== sourceKey;
		if (sourceChanged) {
			hydratedResumeSourceRef.current = sourceKey;
		}
		const shouldHydrate = sourceChanged || !resume;
		if (!shouldHydrate) return;

		if (hasSelectedVersionId) {
			if (!versionDetailQuery.data) {
				setResume(null);
				return;
			}
			const selectedVersionResume =
				versionDetailQuery.data.version.isActive && resumeQuery.data
					? resumeQuery.data.resume
					: versionDetailQuery.data.resume;
			setResume(cloneResume(selectedVersionResume));
			return;
		}
		if (draftMode) {
			if (!versionPreviewQuery.data) {
				setResume(null);
				return;
			}
			setResume(cloneResume(versionPreviewQuery.data));
			return;
		}
		if (!resumeQuery.data?.resume) return;
		setResume(cloneResume(resumeQuery.data.resume));
	}, [
		draftBase,
		draftMode,
		draftName,
		hasSelectedVersionId,
		resume,
		resumeQuery.data,
		selectedVersionId,
		versionDetailQuery.data,
		versionPreviewQuery.data,
		isGuestMode,
	]);

	useEffect(() => {
		if (!hasSelectedVersionId || !versionDetailQuery.isError) return;
		setToast({
			type: "error",
			message: "Selected version was not found. Redirected to live resume editor.",
		});
		navigate("/dashboard/resume", { replace: true });
	}, [hasSelectedVersionId, navigate, versionDetailQuery.isError]);


	const hasLanguagesContent = Boolean(resume?.content.languages.length);
	const structuredSectionsWithContent = useMemo(
		() =>
			resume
				? listSections.filter(
						(section) =>
							(resume.content[section.key] as ResumeStructuredListItem[]).length > 0,
				  )
				: [],
		[resume],
	);
	const customSectionGroups = useMemo(() => {
		if (!resume) return [];
		const grouped = new Map<string, ResumeDynamicSection[]>();
		for (const section of resume.content.customSections) {
			const title = section.title.trim() || "Untitled section";
			const existing = grouped.get(title);
			if (existing) {
				existing.push(section);
				continue;
			}
			grouped.set(title, [section]);
		}
		return Array.from(grouped.entries()).map(([title, items]) => ({ title, items }));
	}, [resume]);

	const contentSectionNav = useMemo(
		() => [
			{ id: "resume-content-header", label: "Header" },
			{ id: "resume-content-summary", label: "Summary" },
			{ id: "resume-content-skills", label: "Skills" },
			{ id: "resume-content-experience", label: "Experience" },
			{ id: "resume-content-education", label: "Education" },
			{ id: "resume-content-projects", label: "Projects" },
			...(hasLanguagesContent ? [{ id: "resume-content-languages", label: "Languages" }] : []),
			...structuredSectionsWithContent.map((section) => ({
				id: `resume-content-${section.key}`,
				label: section.title,
			})),
			{ id: "resume-content-custom", label: "Custom" },
		],
		[hasLanguagesContent, structuredSectionsWithContent],
	);

	useEffect(() => {
		if (!contentSectionNav.length) return;
		if (contentSectionNav.some((section) => section.id === activeContentSection)) return;
		setActiveContentSection(contentSectionNav[0]?.id ?? "resume-content-header");
	}, [activeContentSection, contentSectionNav]);

	const persistResumeWithContext = async (payload: ResumeRecord) => {
		if (isGuestMode) {
			return {
				resume: payload,
				savedDraft: false,
				createdVersionId: null as number | null,
			};
		}
		if (draftMode) {
			if (!draftName) {
				throw new Error("Version name is required.");
			}
			const created = await api.post<{ version: ResumeVersionSummary }>(
				"/resumes/me/versions",
				{ name: draftName, base: draftBase, resume: payload },
			);
			const createdVersionId = created.data.version.id;
			const { data } = await api.get<ResumeVersionDetail>(
				`/resumes/me/versions/${createdVersionId}`,
			);
			return {
				resume: data.resume,
				savedDraft: true,
				createdVersionId,
			};
		}

		if (
			hasSelectedVersionId &&
			versionDetailQuery.data?.version &&
			!versionDetailQuery.data.version.isActive
		) {
			const { data } = await api.put<ResumeVersionDetail>(
				`/resumes/me/versions/${selectedVersionId}/snapshot`,
				{ resume: payload },
			);
			return {
				resume: data.resume,
				savedDraft: true,
				createdVersionId: null as number | null,
			};
		}

		const { data } = await api.put<{ resume: ResumeRecord; validation: ResumeValidationResult }>(
			"/resumes/me",
			{ resume: payload },
		);
		return {
			resume: data.resume,
			savedDraft: false,
			createdVersionId: null as number | null,
		};
	};

	const saveMutation = useMutation({
		mutationFn: async (payload?: ResumeRecord) => {
			if (!resume && !payload) {
				throw new Error("Resume data is not ready.");
			}
			return persistResumeWithContext(cloneResume(payload ?? resume!));
		},
		onSuccess: async (result) => {
			setToast({
				type: "success",
				message: result.savedDraft
					? "Saved. Draft version updated."
					: "Saved. Your live resume is updated.",
			});
			setResume(cloneResume(result.resume));
			setPdfPreviewNonce((current) => current + 1);
			if (isAuthed) {
				await queryClient.invalidateQueries({ queryKey: ["my-resume"] });
				await queryClient.invalidateQueries({ queryKey: ["my-resume-versions"] });
			}
			if (result.createdVersionId) {
				navigate(`/dashboard/resume?versionId=${result.createdVersionId}`, {
					replace: true,
				});
				await queryClient.invalidateQueries({
					queryKey: ["my-resume-version", result.createdVersionId],
				});
				return;
			}
			if (hasSelectedVersionId) {
				await queryClient.invalidateQueries({
					queryKey: ["my-resume-version", selectedVersionId],
				});
			}
		},
		onError: (error) => {
			const responseData = (error as AxiosError<{ message?: string }>).response
				?.data;
			const fallback =
				error instanceof Error && error.message
					? error.message
					: "Failed to save resume.";
			setToast({
				type: "error",
				message: responseData?.message ?? fallback,
			});
		},
	});

	const applyTemplateMutation = useMutation({
		mutationFn: async (nextResume: ResumeRecord) =>
			persistResumeWithContext(cloneResume(nextResume)),
		onSuccess: async (result) => {
			setResume(cloneResume(result.resume));
			setPdfPreviewNonce((current) => current + 1);
			if (isAuthed) {
				await queryClient.invalidateQueries({ queryKey: ["my-resume"] });
				await queryClient.invalidateQueries({ queryKey: ["my-resume-versions"] });
			}
			if (result.createdVersionId) {
				navigate(`/dashboard/resume?versionId=${result.createdVersionId}`, {
					replace: true,
				});
				await queryClient.invalidateQueries({
					queryKey: ["my-resume-version", result.createdVersionId],
				});
				return;
			}
			if (hasSelectedVersionId) {
				await queryClient.invalidateQueries({
					queryKey: ["my-resume-version", selectedVersionId],
				});
			}
		},
		onError: (error) => {
			const responseData = (error as AxiosError<{ message?: string }>).response
				?.data;
			setToast({
				type: "error",
				message: responseData?.message ?? "Failed to apply PDF template.",
			});
		},
	});

	const createVersionMutation = useMutation({
		mutationFn: async (input: { name: string; base: ResumeVersionBase }) => input,
		onSuccess: async (input) => {
			setVersionToCreate(null);
			navigate(
				`/dashboard/resume?draft=1&base=${encodeURIComponent(input.base)}&name=${encodeURIComponent(input.name)}`,
			);
		},
	});

	const renameVersionMutation = useMutation({
		mutationFn: async (nextName: string) => {
			const versionId = hasSelectedVersionId
				? selectedVersionId
				: activeVersion?.id;
			if (!versionId) throw new Error("Version not found.");
			return api.put(`/resumes/me/versions/${versionId}`, { name: nextName });
		},
		onSuccess: async () => {
			setToast({ type: "success", message: "Version renamed." });
			setRenameDialogOpen(false);
			await queryClient.invalidateQueries({ queryKey: ["my-resume-versions"] });
			if (hasSelectedVersionId) {
				await queryClient.invalidateQueries({
					queryKey: ["my-resume-version", selectedVersionId],
				});
			}
		},
		onError: () => {
			setToast({ type: "error", message: "Failed to rename version." });
		},
	});

	const activateVersionMutation = useMutation({
		mutationFn: async (versionId: number) =>
			api.put(`/resumes/me/versions/${versionId}/activate`),
		onSuccess: async () => {
			setToast({ type: "success", message: "Version is now live." });
			await queryClient.invalidateQueries({ queryKey: ["my-resume"] });
			await queryClient.invalidateQueries({ queryKey: ["my-resume-versions"] });
			if (hasSelectedVersionId) {
				await queryClient.invalidateQueries({
					queryKey: ["my-resume-version", selectedVersionId],
				});
			}
		},
		onError: () => {
			setToast({ type: "error", message: "Failed to set this version live." });
		},
	});

	const deleteVersionMutation = useMutation({
		mutationFn: async () => {
			const versionId = hasSelectedVersionId
				? selectedVersionId
				: activeVersion?.id;
			if (!versionId) throw new Error("Version not found.");
			return api.delete(`/resumes/me/versions/${versionId}`);
		},
		onSuccess: async () => {
			setToast({ type: "success", message: "Version deleted." });
			setDeleteDialogOpen(false);
			await queryClient.invalidateQueries({ queryKey: ["my-resume-versions"] });
			navigate("/dashboard/resume");
		},
		onError: () => {
			setToast({ type: "error", message: "Failed to delete version." });
		},
	});

	const setGuestPreviewUrlFromBlob = (blob: Blob) => {
		const previewUrl = window.URL.createObjectURL(blob);
		setGuestPdfPreviewUrl((current) => {
			if (current) {
				window.URL.revokeObjectURL(current);
			}
			return previewUrl;
		});
		return previewUrl;
	};

	const requestGuestPdfBlob = async (payload: ResumeRecord) => {
		const response = await api.post("/resumes/guest/pdf", { resume: payload }, {
			responseType: "blob",
		});
		return new Blob([response.data], { type: "application/pdf" });
	};

	const parsePdfValidationBlobError = async (error: AxiosError<Blob>) => {
		let message = "Failed to generate PDF.";
		const payload = error.response?.data;
		if (!(payload instanceof Blob)) {
			return message;
		}
		try {
			const text = await payload.text();
			const parsed = JSON.parse(text) as {
				message?: string;
				validation?: { errors?: Array<{ message?: string }> };
			};
			const validationMessages =
				parsed.validation?.errors
					?.map((entry) => String(entry?.message ?? "").trim())
					.filter(Boolean) ?? [];
			if (validationMessages.length) {
				return validationMessages.join(" ");
			}
			if (parsed?.message) {
				message = parsed.message;
			}
		} catch {
			// Keep fallback message for non-JSON payloads.
		}
		return message;
	};

	const isValidationBlockedPdfError = (error: AxiosError<Blob>) =>
		error.response?.status === 422;

	const downloadGuestPdfMutation = useMutation({
		mutationFn: requestGuestPdfBlob,
		onSuccess: (blob) => {
			const previewUrl = setGuestPreviewUrlFromBlob(blob);
			const anchor = document.createElement("a");
			anchor.href = previewUrl;
			anchor.download = "resume.pdf";
			document.body.append(anchor);
			anchor.click();
			anchor.remove();
			setToast({
				type: "success",
				message: "PDF generated. Nothing was saved.",
			});
		},
		onError: async (error) => {
			const axiosError = error as AxiosError<Blob>;
			if (isValidationBlockedPdfError(axiosError)) return;
			const message = await parsePdfValidationBlobError(axiosError);
			setToast({ type: "error", message });
		},
	});

	const refreshGuestPreviewMutation = useMutation({
		mutationFn: requestGuestPdfBlob,
		onSuccess: (blob) => {
			setGuestPreviewUrlFromBlob(blob);
		},
		onError: async (error) => {
			const axiosError = error as AxiosError<Blob>;
			if (isValidationBlockedPdfError(axiosError)) return;
			const message = await parsePdfValidationBlobError(axiosError);
			setToast({ type: "error", message });
		},
	});

	const buildResumeWithDraftInputs = (source: ResumeRecord): ResumeRecord => {
		const cloned = cloneResume(source);
		return {
			...cloned,
			content: {
				...cloned.content,
				skills: serializeSkillCategoryDrafts(skillCategoryDrafts),
				languages: languagesDraftInput
					.split(",")
					.map((entry) => entry.trim())
					.filter(Boolean),
				experience: cloned.content.experience.map((entry) => ({
					...entry,
					bullets: parseTextareaLines(
						experienceBulletsDraftById[entry.id] ?? entry.bullets.join("\n"),
					),
				})),
			},
		};
	};

	const triggerPrimaryAction = () => {
		if (!resume) return;
		const nextResume = buildResumeWithDraftInputs(resume);
		setResume(nextResume);
		if (isGuestMode) {
			downloadGuestPdfMutation.mutate(nextResume);
			return;
		}
		saveMutation.mutate(nextResume);
	};

	const triggerGuestPreviewRefresh = () => {
		if (!resume || !isGuestMode) return;
		const nextResume = buildResumeWithDraftInputs(resume);
		setResume(nextResume);
		setGuestPreviewAttempted(true);
		refreshGuestPreviewMutation.mutate(nextResume);
	};

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const isMeta = event.ctrlKey || event.metaKey;
			const key = event.key.toLowerCase();
			const isSaveKey = isMeta && key === "s" && !event.altKey;
			const isPreviewKey = isMeta && event.shiftKey && key === "p";
			if (isSaveKey) {
				event.preventDefault();
				if (
					!resume ||
					saveMutation.isPending ||
					downloadGuestPdfMutation.isPending
				) return;
				triggerPrimaryAction();
				return;
			}
			if (isPreviewKey) {
				event.preventDefault();
				openPreviewModal();
				return;
			}
			if (key === "escape") {
				if (openedFromDashboardPreview && previewOpen) {
					navigate("/dashboard");
					return;
				}
				setPreviewOpen(false);
				setIsFloatingPreviewDragging(false);
				setShortcutsOpen(false);
				setResetLayoutDialogOpen(false);
				setRenameDialogOpen(false);
				setDeleteDialogOpen(false);
				setCreateModal(null);
				setCreateForm(makeCreateFormDefaults());
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [
		resume,
		previewOpen,
		isGuestMode,
		saveMutation,
		downloadGuestPdfMutation.isPending,
		openedFromDashboardPreview,
		navigate,
	]);

	useEffect(() => {
		if (previewOpen || floatingPreviewPosition) return;
		const maxX = Math.max(
			FLOATING_PREVIEW_MIN_OFFSET,
			window.innerWidth - FLOATING_PREVIEW_COLLAPSED_WIDTH - FLOATING_PREVIEW_MIN_OFFSET,
		);
		const maxY = Math.max(
			FLOATING_PREVIEW_MIN_TOP,
			window.innerHeight - FLOATING_PREVIEW_COLLAPSED_HEIGHT - FLOATING_PREVIEW_MIN_OFFSET,
		);
		setFloatingPreviewPosition({
			x: maxX,
			y: Math.min(
				Math.max(
					window.innerHeight - FLOATING_PREVIEW_COLLAPSED_HEIGHT - FLOATING_PREVIEW_MIN_OFFSET,
					FLOATING_PREVIEW_MIN_TOP,
				),
				maxY,
			),
		});
	}, [previewOpen, floatingPreviewPosition]);

	useEffect(() => {
		const onResize = () => {
			setFloatingPreviewPosition((current) => {
				if (!current) return current;
				const maxX = Math.max(
					FLOATING_PREVIEW_MIN_OFFSET,
					window.innerWidth - FLOATING_PREVIEW_COLLAPSED_WIDTH - FLOATING_PREVIEW_MIN_OFFSET,
				);
				const maxY = Math.max(
					FLOATING_PREVIEW_MIN_TOP,
					window.innerHeight - FLOATING_PREVIEW_COLLAPSED_HEIGHT - FLOATING_PREVIEW_MIN_OFFSET,
				);
				return {
					x: Math.min(Math.max(current.x, FLOATING_PREVIEW_MIN_OFFSET), maxX),
					y: Math.min(Math.max(current.y, FLOATING_PREVIEW_MIN_TOP), maxY),
				};
			});
		};
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

	useEffect(() => {
		if (!previewOpen) return;
		floatingPreviewDragRef.current = null;
		setIsFloatingPreviewDragging(false);
	}, [previewOpen]);

	const handleFloatingPreviewPointerDown = (
		event: ReactPointerEvent<HTMLDivElement>,
	) => {
		if ((event.target as HTMLElement).closest("button, a, input, textarea, select, label")) {
			return;
		}
		if (!floatingPreviewPosition) return;
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		floatingPreviewDragRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			originX: floatingPreviewPosition.x,
			originY: floatingPreviewPosition.y,
		};
		setIsFloatingPreviewDragging(true);
	};

	const handleFloatingPreviewPointerMove = (
		event: ReactPointerEvent<HTMLDivElement>,
	) => {
		const dragState = floatingPreviewDragRef.current;
		if (!dragState || dragState.pointerId !== event.pointerId) return;
		const maxX = Math.max(
			FLOATING_PREVIEW_MIN_OFFSET,
			window.innerWidth - FLOATING_PREVIEW_COLLAPSED_WIDTH - FLOATING_PREVIEW_MIN_OFFSET,
		);
		const maxY = Math.max(
			FLOATING_PREVIEW_MIN_TOP,
			window.innerHeight - FLOATING_PREVIEW_COLLAPSED_HEIGHT - FLOATING_PREVIEW_MIN_OFFSET,
		);
		const nextX = dragState.originX + (event.clientX - dragState.startX);
		const nextY = dragState.originY + (event.clientY - dragState.startY);
		setFloatingPreviewPosition({
			x: Math.min(Math.max(nextX, FLOATING_PREVIEW_MIN_OFFSET), maxX),
			y: Math.min(Math.max(nextY, FLOATING_PREVIEW_MIN_TOP), maxY),
		});
	};

	const stopFloatingPreviewDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
		const dragState = floatingPreviewDragRef.current;
		if (!dragState || dragState.pointerId !== event.pointerId) return;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		floatingPreviewDragRef.current = null;
		setIsFloatingPreviewDragging(false);
	};

	useEffect(() => {
		if (activeTab !== "content") return;
		const sections = contentSectionNav
			.map((entry) => document.getElementById(entry.id))
			.filter((entry): entry is HTMLElement => Boolean(entry));
		if (!sections.length) return;
		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((entry) => entry.isIntersecting)
					.sort(
						(a, b) =>
							a.boundingClientRect.top - b.boundingClientRect.top,
					);
				if (!visible.length) return;
				setActiveContentSection(visible[0].target.id);
			},
			{
				root: null,
				rootMargin: "-20% 0px -65% 0px",
				threshold: [0, 0.25, 0.5, 1],
			},
		);
		for (const section of sections) observer.observe(section);
		return () => observer.disconnect();
	}, [activeTab, contentSectionNav]);

	useEffect(() => {
		if (!isGuestMode || activeTab !== "preview") return;
		if (guestPdfPreviewUrl || refreshGuestPreviewMutation.isPending || guestPreviewAttempted) return;
		setGuestPreviewAttempted(true);
		triggerGuestPreviewRefresh();
	}, [
		activeTab,
		guestPdfPreviewUrl,
		guestPreviewAttempted,
		isGuestMode,
		refreshGuestPreviewMutation.isPending,
	]);

	if (
		sessionQuery.isLoading ||
		resumeQuery.isLoading ||
		versionsQuery.isLoading ||
		(draftMode && versionPreviewQuery.isLoading) ||
		(hasSelectedVersionId && versionDetailQuery.isLoading)
	) {
		return <div className="app-card p-6">Loading resume builder...</div>;
	}
	if (!resume) return null;

	const selectedVersionSummary = versionDetailQuery.data?.version ?? null;
	const editingVersion = isGuestMode
		? null
		: draftMode
		? null
		: hasSelectedVersionId
			? selectedVersionSummary
			: activeVersion;
	const canManageSelectedDraftVersion = Boolean(!isGuestMode && !draftMode && editingVersion);
	const editingVersionName = draftMode
		? draftName || "Untitled Draft"
		: editingVersion?.name ?? (isGuestMode ? "Quick Resume" : "Version");
	const editingVersionIsLive = draftMode ? false : Boolean(editingVersion?.isActive);
	const modeTitle = isGuestMode ? "Quick Resume Builder" : draftMode ? "Creating" : "Editing";
	const modeBadgeLabel = draftMode
		? "Draft (Unsaved)"
		: isGuestMode
			? "Guest Session"
		: editingVersionIsLive
			? "Live"
			: "Draft";

	const openCreateVersionModal = () =>
		setVersionToCreate({
			name: "",
			base: "latest",
			error: "",
		});

	const handleCreateVersionConfirm = () => {
		if (!versionToCreate) return;
		const name = versionToCreate.name.trim();
		if (!name) {
			setVersionToCreate((current) =>
				current ? { ...current, error: "Version name is required." } : current,
			);
			return;
		}
		createVersionMutation.mutate({
			name,
			base: versionToCreate.base,
		});
	};

	const closePreview = () => {
		if (openedFromDashboardPreview) {
			navigate("/dashboard");
			return;
		}
		setPreviewOpen(false);
	};

	const openPreviewModal = () => {
		if (isGuestMode && !guestPdfPreviewUrl && !refreshGuestPreviewMutation.isPending) {
			triggerGuestPreviewRefresh();
		}
		setPreviewOpen(true);
	};

	const commitSkillCategoryDraftsToResume = (nextDrafts: SkillCategoryDraft[]) => {
		const nextSkills = serializeSkillCategoryDrafts(nextDrafts);
		setResume((current) =>
			current
				? {
						...current,
						content: {
							...current.content,
							skills: nextSkills,
						},
				  }
				: current,
		);
	};

	const applySkillCategoryDrafts = (nextDrafts: SkillCategoryDraft[]) => {
		setSkillCategoryDrafts(nextDrafts);
	};

	const versionPdfPath = hasSelectedVersionId
		? `/resumes/me/versions/${selectedVersionId}/pdf`
		: "/resumes/me/pdf";
	const pdfDownloadHref = !isAuthed || isGuestMode
		? ""
		: `${apiBaseUrl}${versionPdfPath}?download=1`;
	const pdfInlineVersion = resume.updatedAt ?? `${resume.templateKey}-${pdfPreviewNonce}`;
	const pdfInlineHref = !isAuthed || isGuestMode
		? ""
		: `${apiBaseUrl}${versionPdfPath}?v=${encodeURIComponent(
				pdfInlineVersion,
		  )}&template=${encodeURIComponent(resume.templateKey)}&nonce=${pdfPreviewNonce}`;
	const effectivePdfInlineHref = isGuestMode ? guestPdfPreviewUrl : pdfInlineHref;
	const visibleSectionOrder = resume.layout.sectionOrder.filter((section) =>
		section === "header" ? true : Boolean(resume.layout.visibility[section]),
	);

	const handleTemplateChange = (event: ChangeEvent<HTMLSelectElement>) => {
		if (applyTemplateMutation.isPending) return;
		const selected = event.target.value as ResumeTemplateKey;
		const nextTemplateKey: ResumeTemplateKey = resumeTemplateOptions.some(
			(option) => option.key === selected,
		)
			? selected
			: "deux_modern_v1";
		if (resume.templateKey === nextTemplateKey) return;
		if (isGuestMode) {
			setResume((current) =>
				current
					? {
							...current,
							templateKey: nextTemplateKey,
					  }
					: current,
			);
			setPdfPreviewNonce((current) => current + 1);
			return;
		}
		const nextResume: ResumeRecord = {
			...resume,
			templateKey: nextTemplateKey,
		};
		setResume(nextResume);
		applyTemplateMutation.mutate(nextResume, {
			onError: () => {
				setToast({ type: "error", message: "Failed to apply PDF template." });
			},
		});
	};

	type HeaderStringFieldKey = Exclude<
		keyof ResumeRecord["content"]["header"],
		"contactItems" | "linkItems"
	>;

	const setHeaderField = (key: HeaderStringFieldKey, value: string) => {
		setResume((current) =>
			current
				? {
						...current,
						content: {
							...current.content,
							header: { ...current.content.header, [key]: value },
						},
				  }
				: current,
		);
	};

	const updateHeaderArrayItem = (
		key: "contactItems" | "linkItems",
		index: number,
		value: string,
	) => {
		setResume((current) => {
			if (!current) return current;
			const nextItems = [...current.content.header[key]];
			if (index < 0 || index >= nextItems.length) return current;
			nextItems[index] = value;
			return {
				...current,
				content: {
					...current.content,
					header: { ...current.content.header, [key]: nextItems },
				},
			};
		});
	};

	const addHeaderArrayItem = (key: "contactItems" | "linkItems") => {
		setResume((current) => {
			if (!current) return current;
			const max = key === "contactItems" ? MAX_HEADER_CONTACT_ITEMS : MAX_HEADER_LINK_ITEMS;
			if (current.content.header[key].length >= max) return current;
			return {
				...current,
				content: {
					...current.content,
					header: {
						...current.content.header,
						[key]: [...current.content.header[key], ""],
					},
				},
			};
		});
	};

	const removeHeaderArrayItem = (key: "contactItems" | "linkItems", index: number) => {
		setResume((current) => {
			if (!current) return current;
			return {
				...current,
				content: {
					...current.content,
					header: {
						...current.content.header,
						[key]: current.content.header[key].filter((_, itemIndex) => itemIndex !== index),
					},
				},
			};
		});
	};

	const handleHeaderPhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			event.target.value = "";
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === "string") {
				setHeaderField("photoDataUrl", reader.result);
			}
		};
		reader.readAsDataURL(file);
		event.target.value = "";
	};

	const updateListSection = (
		section: keyof ResumeRecord["content"],
		index: number,
		field: keyof ResumeStructuredListItem,
		value: string,
	) => {
		setResume((current) => {
			if (!current) return current;
			const nextItems = [...(current.content[section] as ResumeStructuredListItem[])];
			if (index < 0 || index >= nextItems.length) return current;
			const target = nextItems[index];
			nextItems[index] = {
				...target,
				[field]: field === "details" ? parseTextareaLines(value) : value,
			};
			return {
				...current,
				content: { ...current.content, [section]: nextItems },
			};
		});
	};

	const scrollToContentSection = (sectionId: string) => {
		const element = document.getElementById(sectionId);
		if (!element) return;
		setActiveContentSection(sectionId);
		element.scrollIntoView({ behavior: "smooth", block: "center" });
	};

	const closeCreateModal = () => {
		setCreateModal(null);
		setCreateForm(makeCreateFormDefaults());
	};

	const openCreateModal = (
		modal: ResumeCreateModalState,
		overrides?: Partial<ResumeCreateFormState>,
	) => {
		const defaults = makeCreateFormDefaults();
		setCreateForm({
			...defaults,
			...overrides,
			categories: overrides?.categories ?? defaults.categories,
		});
		setCreateModal(modal);
	};

	const submitCreateModal = () => {
		if (!createModal) return;
		const bodyLines = buildCreateModalBodyLines(createForm);
		const sectionTitle = createForm.sectionTitle.trim() || "Custom Section";
		const effectiveLeftHeader =
			createForm.headerMode === "none"
				? createForm.leftHeader.trim()
				: createForm.leftHeader.trim();
		const effectiveRightHeader =
			createForm.headerMode === "split" ? createForm.rightHeader.trim() : "";
		const effectiveLeftSubheader =
			createForm.headerMode === "split" && createForm.showSubheader
				? createForm.leftSubheader.trim()
				: "";
		const effectiveRightSubheader =
			createForm.headerMode === "split" && createForm.showSubheader
				? createForm.rightSubheader.trim()
				: "";
		setResume((current) => {
			if (!current) return current;
			switch (createModal.kind) {
				case "experience":
					{
						const range = parseDateRange(effectiveRightSubheader);
						return {
							...current,
							content: {
								...current.content,
								experience: [
									...current.content.experience,
									{
										id: makeId(),
										role: effectiveLeftSubheader,
										company: effectiveLeftHeader,
										location: effectiveRightHeader,
										startDate: range.startDate,
										endDate: range.endDate,
										isCurrent: range.isCurrent,
										bullets: bodyLines,
									},
								],
							},
						};
					}
				case "education":
					return {
						...current,
						content: {
								...current.content,
								education: [
									...current.content.education,
									{
										id: makeId(),
										school: effectiveLeftHeader,
										degree: effectiveLeftSubheader,
										location: effectiveRightHeader,
										graduationDate: effectiveRightSubheader,
										details: bodyLines,
									},
								],
							},
					};
				case "project":
					return {
						...current,
						content: {
							...current.content,
								projects: [
									...current.content.projects,
									{
										id: makeId(),
										name: effectiveLeftHeader,
										description: effectiveRightHeader || effectiveLeftSubheader,
										url: "",
										highlights: bodyLines,
									},
								],
							},
					};
				case "structured":
					if (!createModal.sectionKey) return current;
					return {
						...current,
						content: {
							...current.content,
								[createModal.sectionKey]: [
									...(current.content[createModal.sectionKey] as ResumeStructuredListItem[]),
									{
										...createResumeListItem(),
										title: effectiveLeftHeader,
										subtitle: effectiveLeftSubheader,
										date: effectiveRightSubheader,
										location: effectiveRightHeader,
										details: bodyLines,
										url: "",
									},
								],
							},
						};
				case "custom":
					return {
						...current,
						content: {
							...current.content,
							customSections: [
								...current.content.customSections,
								{
									id: makeId(),
									title: sectionTitle,
									headerMode: createForm.headerMode,
									bodyMode: createForm.bodyMode,
									showSubheader: createForm.showSubheader,
									leftHeader: effectiveLeftHeader,
									rightHeader: effectiveRightHeader,
									leftSubheader: effectiveLeftSubheader,
									rightSubheader: effectiveRightSubheader,
									text:
										createForm.bodyMode === "text"
											? createForm.text.trim()
											: "",
									bullets:
										createForm.bodyMode === "bullets"
											? parseTextareaLines(createForm.bulletsText).slice(
													0,
													MAX_CUSTOM_SECTION_BULLETS,
											  )
											: [],
									categories:
										createForm.bodyMode === "categories"
											? createForm.categories
													.map((row) => ({
														id: row.id,
														category: row.category.trim(),
														values: parseCommaValues(row.valuesText),
													}))
													.filter((row) => row.category || row.values.length)
											: [],
								},
							],
						},
					};
				default:
					return current;
			}
		});
		closeCreateModal();
	};

	return (
		<main className="builder-v2 overflow-x-hidden space-y-6 pb-20">
			{toast ? (
				<div className="fixed right-4 top-4 z-50">
					<div
						className={
							toast.type === "error"
								? "rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 shadow-lg"
								: "rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 shadow-lg"
						}
					>
						{toast.message}
					</div>
				</div>
			) : null}
			<Card className="v2-panel">
				<CardHeader className="gap-3">
						<div className="space-y-1.5">
							<div className="flex flex-wrap items-center gap-2">
								<CardTitle className="text-2xl sm:text-3xl">
									{isGuestMode ? modeTitle : `${modeTitle}: ${editingVersionName}`}
								</CardTitle>
							<Badge
								variant={editingVersionIsLive ? "secondary" : "outline"}
								className={
									editingVersionIsLive
										? "border-primary/45 bg-primary/15 text-primary"
										: undefined
								}
							>
								{modeBadgeLabel}
							</Badge>
							</div>
							<CardDescription>
								{isGuestMode
									? "Build a resume and download instantly. Guest mode does not save drafts or versions."
									: "Edit structured resume content, tune section visibility, and validate against export rules in real time."}
							</CardDescription>
						</div>
						<CardAction className="hidden w-full flex-col items-start gap-2 lg:flex lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
							{!isGuestMode ? (
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="inline-flex"
									onClick={openCreateVersionModal}
								>
									New draft version
								</Button>
							) : null}
							{!isGuestMode && canManageSelectedDraftVersion ? (
								<Button
									type="button"
									size="sm"
								variant="outline"
								className="inline-flex"
								onClick={() => setRenameDialogOpen(true)}
							>
								<Pencil className="size-4" />
									Rename
								</Button>
							) : null}
							{!isGuestMode && canManageSelectedDraftVersion ? (
								<Button
									type="button"
									size="sm"
								variant="outline"
								className="inline-flex text-destructive hover:text-destructive"
								onClick={() => setDeleteDialogOpen(true)}
								disabled={Boolean(editingVersion?.isActive)}
							>
								<Trash2 className="size-4" />
								Delete
							</Button>
						) : null}
							{!isGuestMode ? (
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="inline-flex"
									onClick={() => setPreviewOpen(true)}
								>
									<Eye className="size-4" />
									Open Preview
								</Button>
							) : null}
							<Button
								type="button"
								size="sm"
								className="inline-flex"
								onClick={triggerPrimaryAction}
								disabled={saveMutation.isPending || downloadGuestPdfMutation.isPending}
							>
								<Save className="size-4" />
								{isGuestMode
									? downloadGuestPdfMutation.isPending
										? "Generating..."
										: "Generate PDF"
									: saveMutation.isPending
										? "Saving..."
										: "Save changes"}
							</Button>
							{!isGuestMode ? (
								<a href={pdfDownloadHref} className="inline-flex">
									<Button type="button" size="sm" variant="secondary" className="inline-flex">
										<Download className="size-4" />
										Download PDF
									</Button>
								</a>
							) : null}
						</CardAction>
					<div className="flex w-full items-center justify-end gap-2 lg:hidden">
						<Button
							type="button"
							size="icon-sm"
							variant="outline"
							aria-label="Open resume actions"
							onClick={() => setMobileActionsOpen(true)}
						>
							<MoreHorizontal className="size-4" />
						</Button>
					</div>
				</CardHeader>
			</Card>
				{isGuestMode ? (
					<div className="rounded-md border border-sky-500/35 bg-sky-500/10 px-3 py-2 text-sm text-sky-900 dark:text-sky-100">
						Guest mode is one-time only. Resume drafts and versions are not saved.
					</div>
				) : draftMode ? (
					<div className="rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
						You are creating a draft. This is not public yet until you save and set a version live.
					</div>
				) : !isGuestMode && editingVersion && !editingVersionIsLive ? (
				<div className="flex flex-col items-start justify-between gap-2 rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center">
					<div className="text-sm text-amber-800 dark:text-amber-200">
						You are editing a draft version. Public resume PDF still shows the current live version.
					</div>
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="w-auto"
						onClick={() => activateVersionMutation.mutate(editingVersion.id)}
						disabled={activateVersionMutation.isPending}
					>
						{activateVersionMutation.isPending ? "Setting live..." : "Set this version live"}
					</Button>
				</div>
			) : null}

			<Sheet open={mobileActionsOpen} onOpenChange={setMobileActionsOpen}>
				<SheetContent side="bottom" className="rounded-t-2xl p-0 lg:hidden">
					<SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
						<SheetTitle>Resume actions</SheetTitle>
					</SheetHeader>
					<div className="space-y-2 px-4 py-4">
							<Button
								type="button"
								className="w-full justify-start"
								onClick={() => {
									setMobileActionsOpen(false);
									triggerPrimaryAction();
								}}
								disabled={saveMutation.isPending || downloadGuestPdfMutation.isPending}
							>
								<Save className="size-4" />
								{isGuestMode
									? downloadGuestPdfMutation.isPending
										? "Generating..."
										: "Generate PDF"
									: saveMutation.isPending
										? "Saving..."
										: "Save changes"}
							</Button>
							<Button
								type="button"
								variant="outline"
								className="w-full justify-start"
								onClick={() => {
									setMobileActionsOpen(false);
									openPreviewModal();
								}}
							>
								<Eye className="size-4" />
								Open Preview
							</Button>
							{!isGuestMode ? (
								<Button
									type="button"
									variant="outline"
									className="w-full justify-start"
									onClick={() => {
										setMobileActionsOpen(false);
										openCreateVersionModal();
									}}
								>
									New draft version
								</Button>
							) : null}
							{!isGuestMode && canManageSelectedDraftVersion ? (
								<Button
									type="button"
									variant="outline"
								className="w-full justify-start"
								onClick={() => {
									setMobileActionsOpen(false);
									setRenameDialogOpen(true);
								}}
							>
								<Pencil className="size-4" />
									Rename version
								</Button>
							) : null}
							{!isGuestMode && canManageSelectedDraftVersion ? (
								<Button
									type="button"
									variant="outline"
								className="w-full justify-start text-destructive hover:text-destructive"
								onClick={() => {
									setMobileActionsOpen(false);
									setDeleteDialogOpen(true);
								}}
								disabled={Boolean(editingVersion?.isActive)}
							>
								<Trash2 className="size-4" />
									Delete version
								</Button>
							) : null}
							{!isGuestMode ? (
								<a href={pdfDownloadHref}>
									<Button
										type="button"
										variant="secondary"
										className="w-full justify-start"
										onClick={() => setMobileActionsOpen(false)}
									>
										<Download className="size-4" />
										Download PDF
									</Button>
								</a>
							) : null}
					</div>
				</SheetContent>
			</Sheet>

			<Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
				<div className="builder-sticky-subnav rounded-xl border border-border/60 bg-background/90 p-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70">
					<TabsList className="!h-auto w-full flex-wrap justify-start gap-1">
						<TabsTrigger value="content" className="h-9 flex-none px-4">
							Content
						</TabsTrigger>
						<TabsTrigger value="layout" className="h-9 flex-none px-4">
							Layout
						</TabsTrigger>
						<TabsTrigger value="preview" className="h-9 flex-none px-4">
							Preview
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="content" className="min-w-0 space-y-4">
					<div
						ref={navShellRef}
						className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)] xl:items-start"
					>
						<aside ref={navAsideRef} className="min-w-0 xl:shrink-0">
							<div style={pinnedStyle}>
								<div className="p-0 xl:v2-panel xl:p-2 xl:max-h-[calc(100vh-7.5rem)] xl:overflow-y-auto">
									<div className="hidden px-2 pb-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground xl:block">
										CONTENT SECTIONS
									</div>
									<div className="space-y-2 xl:hidden">
										<Label htmlFor="resume-content-mobile-section">
											Content section
										</Label>
										<select
											id="resume-content-mobile-section"
											value={activeContentSection}
											onChange={(event) =>
												scrollToContentSection(event.target.value)
											}
											className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
										>
												{contentSectionNav.map((section) => (
													<option key={section.id} value={section.id}>
														{section.label}
													</option>
												))}
										</select>
									</div>
									<div className="hidden min-w-0 flex-wrap gap-1 pb-1 xl:flex xl:flex-col xl:flex-nowrap">
										{contentSectionNav.map((section) => (
											<Button
												key={section.id}
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => scrollToContentSection(section.id)}
												className={
													activeContentSection === section.id
														? "justify-start whitespace-nowrap bg-primary text-primary-foreground"
														: "justify-start whitespace-nowrap"
												}
											>
												{section.label}
											</Button>
										))}
									</div>
								</div>
							</div>
						</aside>

						<div className="min-w-0 space-y-4 pb-24">
						<Card id="resume-content-header" className={contentSectionCardClassName}>
							<CardHeader>
								<CardTitle className="text-lg">Header</CardTitle>
							</CardHeader>
							<CardContent className="space-y-5">
								<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label>Full name</Label>
									<Input
										maxLength={60}
										placeholder="Your Full Name"
										value={resume.content.header.fullName}
									onChange={(event) => setHeaderField("fullName", event.target.value)}
								/>
							</div>
								<div className="space-y-2">
									<Label>Headline</Label>
									<Input
									maxLength={90}
									placeholder="Your Role (e.g., Full Stack Developer)"
									value={resume.content.header.headline}
										onChange={(event) => setHeaderField("headline", event.target.value)}
										/>
									</div>
									<div className="space-y-2">
										<Label>Email (required)</Label>
										<Input
											type="email"
											maxLength={90}
											placeholder="sample@email.com"
											value={resume.content.header.email}
											onChange={(event) => setHeaderField("email", event.target.value)}
										/>
									</div>
									<div className="space-y-2">
										<Label>Location</Label>
										<Input
											maxLength={90}
											placeholder="Quezon City, Philippines"
											value={resume.content.header.location}
											onChange={(event) => setHeaderField("location", event.target.value)}
										/>
									</div>
								</div>
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<Label>Contact info</Label>
											<Button
												type="button"
												size="sm"
												variant="outline"
												className="shrink-0"
												onClick={() => addHeaderArrayItem("contactItems")}
												disabled={
													resume.content.header.contactItems.length >=
													MAX_HEADER_CONTACT_ITEMS
											}
										>
											Add contact
										</Button>
									</div>
										<div className="space-y-2">
											{resume.content.header.contactItems.map((item, index) => (
												<div key={`contact-${index}`} className="flex items-center gap-3">
													<Input
														maxLength={90}
														placeholder={
															HEADER_CONTACT_PLACEHOLDERS[index] ?? `Contact ${index + 1}`
														}
														value={item}
													onChange={(event) =>
														updateHeaderArrayItem("contactItems", index, event.target.value)
													}
												/>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => removeHeaderArrayItem("contactItems", index)}
												>
													<Trash2 className="size-4" />
												</Button>
											</div>
										))}
										{resume.content.header.contactItems.length === 0 ? (
											<div className="text-xs text-muted-foreground">
												Add up to {MAX_HEADER_CONTACT_ITEMS} contact entries.
											</div>
										) : null}
										</div>
									</div>
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<Label>Header links</Label>
											<Button
												type="button"
												size="sm"
												variant="outline"
												className="shrink-0"
												onClick={() => addHeaderArrayItem("linkItems")}
												disabled={resume.content.header.linkItems.length >= MAX_HEADER_LINK_ITEMS}
											>
											Add link
										</Button>
									</div>
										<div className="space-y-2">
											{resume.content.header.linkItems.map((item, index) => (
												<div key={`link-${index}`} className="flex items-center gap-3">
													<Input
														maxLength={90}
														placeholder={
															HEADER_LINK_PLACEHOLDERS[index] ?? `Link ${index + 1}`
														}
														value={item}
													onChange={(event) =>
														updateHeaderArrayItem("linkItems", index, event.target.value)
													}
												/>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => removeHeaderArrayItem("linkItems", index)}
												>
													<Trash2 className="size-4" />
												</Button>
											</div>
										))}
										{resume.content.header.linkItems.length === 0 ? (
											<div className="text-xs text-muted-foreground">
												Add up to {MAX_HEADER_LINK_ITEMS} links.
											</div>
										) : null}
										</div>
									</div>
									<div className="space-y-3">
										<Label>Header Photo (1x1)</Label>
										<div className="flex flex-wrap items-center gap-3">
											<Input
											type="file"
											accept="image/png,image/jpeg,image/jpg"
											onChange={handleHeaderPhotoUpload}
											className="max-w-sm"
										/>
										{resume.content.header.photoDataUrl ? (
											<Button
												type="button"
												variant="outline"
												onClick={() => setHeaderField("photoDataUrl", "")}
											>
												Remove photo
											</Button>
										) : null}
									</div>
									{resume.content.header.photoDataUrl ? (
										<div className="pt-1">
											<img
												src={resume.content.header.photoDataUrl}
												alt="Header preview"
												className="h-14 w-14 rounded-sm border object-cover"
											/>
										</div>
									) : null}
								</div>
						</CardContent>
					</Card>

					<Card id="resume-content-summary" className={contentSectionCardClassName}>
						<CardHeader>
							<CardTitle className="text-lg">Summary</CardTitle>
						</CardHeader>
						<CardContent>
							<Textarea
								rows={4}
								placeholder="2-3 lines on your strengths, stack, and measurable impact."
								value={resume.content.summary}
								onChange={(event) =>
									setResume((current) =>
										current
											? {
													...current,
													content: {
														...current.content,
														summary: event.target.value,
													},
											  }
											: current,
									)
								}
							/>
						</CardContent>
					</Card>

						<Card id="resume-content-skills" className={contentSectionCardClassName}>
							<CardHeader>
								<CardTitle className="text-lg">
									Skills by Category (per line)
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{skillCategoryDrafts.map((draft) => (
									<div key={draft.id} className="grid gap-2 md:grid-cols-[200px_1fr_auto]">
										<Input
											placeholder="Category"
											value={draft.category}
											onChange={(event) =>
												applySkillCategoryDrafts(
													skillCategoryDrafts.map((entry) =>
														entry.id === draft.id
															? { ...entry, category: event.target.value }
															: entry,
													),
												)
											}
											onBlur={() => commitSkillCategoryDraftsToResume(skillCategoryDrafts)}
										/>
										<Input
											placeholder="Skill 1, Skill 2, Skill 3"
											value={draft.skillsText}
											onChange={(event) =>
												applySkillCategoryDrafts(
													skillCategoryDrafts.map((entry) =>
														entry.id === draft.id
															? { ...entry, skillsText: event.target.value }
															: entry,
													),
												)
											}
											onBlur={() => commitSkillCategoryDraftsToResume(skillCategoryDrafts)}
										/>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											disabled={skillCategoryDrafts.length <= 1}
											onClick={() =>
												(() => {
													const nextDrafts = skillCategoryDrafts.filter(
														(entry) => entry.id !== draft.id,
													);
													applySkillCategoryDrafts(nextDrafts);
													commitSkillCategoryDraftsToResume(nextDrafts);
												})()
											}
										>
											<Trash2 className="size-4" />
											Remove
										</Button>
									</div>
								))}
								<div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() =>
											(() => {
												const nextDrafts = [
													...skillCategoryDrafts,
													{ id: makeId(), category: "", skillsText: "" },
												];
												applySkillCategoryDrafts(nextDrafts);
												commitSkillCategoryDraftsToResume(nextDrafts);
											})()
										}
									>
										Add category line
									</Button>
								</div>
							</CardContent>
						</Card>

					<Card id="resume-content-experience" className={contentSectionCardClassName}>
						<CardHeader className="flex-row items-center justify-between">
							<CardTitle className="text-lg">Experience</CardTitle>
							<Button
								type="button"
								variant="outline"
									onClick={() =>
										openCreateModal({
											kind: "experience",
											title: "Add experience",
											subtitle: "Use the shared section item form.",
											submitLabel: "Add role",
											lockSectionTitle: true,
										}, { sectionTitle: "Experience", headerMode: "split", showSubheader: true })
									}
								>
								Add role
							</Button>
						</CardHeader>
						<CardContent className="space-y-4">
							{resume.content.experience.map((item, index) => (
								<div key={item.id} className={itemBlockClassName}>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="text-sm font-medium">Role {index + 1}</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() =>
												setResume((current) =>
													current
														? {
																...current,
																content: {
																	...current.content,
																	experience: current.content.experience.filter(
																		(_, entryIndex) => entryIndex !== index,
																	),
																},
														  }
														: current,
												)
											}
										>
											<Trash2 className="size-4" />
											Remove
										</Button>
									</div>
									<div className="grid gap-2 md:grid-cols-2">
										<Input
											placeholder="Role"
											value={item.role}
											onChange={(event) =>
												setResume((current) =>
													current
														? {
																...current,
																content: {
																	...current.content,
																	experience: current.content.experience.map((entry, entryIndex) =>
																		entryIndex === index
																			? { ...entry, role: event.target.value }
																			: entry,
																	),
																},
														  }
														: current,
												)
											}
										/>
										<Input
											placeholder="Company"
											value={item.company}
											onChange={(event) =>
												setResume((current) =>
													current
														? {
																...current,
																content: {
																	...current.content,
																	experience: current.content.experience.map((entry, entryIndex) =>
																		entryIndex === index
																			? { ...entry, company: event.target.value }
																			: entry,
																	),
																},
														  }
														: current,
												)
											}
										/>
										<Input
											placeholder="Start date"
											value={item.startDate}
											onChange={(event) =>
												setResume((current) =>
													current
														? {
																...current,
																content: {
																	...current.content,
																	experience: current.content.experience.map((entry, entryIndex) =>
																		entryIndex === index
																			? { ...entry, startDate: event.target.value }
																			: entry,
																	),
																},
														  }
														: current,
												)
											}
										/>
										<Input
											placeholder="End date"
											value={item.endDate}
											onChange={(event) =>
												setResume((current) =>
													current
														? {
																...current,
																content: {
																	...current.content,
																	experience: current.content.experience.map((entry, entryIndex) =>
																		entryIndex === index
																			? { ...entry, endDate: event.target.value, isCurrent: false }
																			: entry,
																	),
																},
														  }
												: current,
											)
										}
									/>
										<Input
											placeholder="Location"
											value={item.location}
											onChange={(event) =>
												setResume((current) =>
													current
														? {
																...current,
																content: {
																	...current.content,
																	experience: current.content.experience.map((entry, entryIndex) =>
																		entryIndex === index
																			? { ...entry, location: event.target.value }
																			: entry,
																	),
																},
														  }
														: current,
												)
											}
										/>
									</div>
										<Textarea
											rows={4}
											placeholder="One bullet per line"
											value={experienceBulletsDraftById[item.id] ?? item.bullets.join("\n")}
											onChange={(event) =>
												setExperienceBulletsDraftById((current) => ({
													...current,
													[item.id]: event.target.value,
												}))
											}
											onBlur={() =>
												setResume((current) =>
													current
														? {
																...current,
																content: {
																	...current.content,
																	experience: current.content.experience.map((entry, entryIndex) =>
																		entryIndex === index
																			? {
																					...entry,
																					bullets: parseTextareaLines(
																						experienceBulletsDraftById[item.id] ??
																							entry.bullets.join("\n"),
																					),
																			  }
																			: entry,
																	),
																},
														  }
														: current,
												)
											}
										/>
								</div>
							))}
						</CardContent>
					</Card>

					<Card id="resume-content-education" className={contentSectionCardClassName}>
						<CardHeader className="flex-row items-center justify-between">
							<CardTitle className="text-lg">Education</CardTitle>
							<Button
								type="button"
								variant="outline"
									onClick={() =>
										openCreateModal({
											kind: "education",
											title: "Add education",
											subtitle: "Use the shared section item form.",
											submitLabel: "Add education",
											lockSectionTitle: true,
										}, { sectionTitle: "Education", headerMode: "split", showSubheader: true })
									}
								>
								Add education
							</Button>
						</CardHeader>
						<CardContent className="space-y-3">
							{resume.content.education.map((item, index) => (
								<div key={item.id} className={itemBlockClassName}>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="text-sm font-medium">Education {index + 1}</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() =>
												setResume((current) =>
													current
														? {
																...current,
																content: {
																	...current.content,
																	education: current.content.education.filter(
																		(_, entryIndex) => entryIndex !== index,
																	),
																},
														  }
														: current,
												)
											}
										>
											<Trash2 className="size-4" />
											Remove
										</Button>
									</div>
									<Input
										placeholder="Degree"
										value={item.degree}
										onChange={(event) =>
											setResume((current) =>
												current
													? {
															...current,
															content: {
																...current.content,
																education: current.content.education.map((entry, entryIndex) =>
																	entryIndex === index
																		? { ...entry, degree: event.target.value }
																		: entry,
																),
															},
													  }
													: current,
											)
										}
									/>
									<Input
										placeholder="School"
										value={item.school}
										onChange={(event) =>
											setResume((current) =>
												current
													? {
															...current,
															content: {
																...current.content,
																education: current.content.education.map((entry, entryIndex) =>
																	entryIndex === index
																		? { ...entry, school: event.target.value }
																		: entry,
																),
															},
													  }
												: current,
											)
										}
									/>
									<div className="grid gap-2 md:grid-cols-2">
										<Input
											placeholder="Location"
											value={item.location}
											onChange={(event) =>
												setResume((current) =>
													current
														? {
																...current,
																content: {
																	...current.content,
																	education: current.content.education.map((entry, entryIndex) =>
																		entryIndex === index
																			? { ...entry, location: event.target.value }
																			: entry,
																	),
																},
														  }
														: current,
												)
											}
										/>
										<Input
											placeholder="Graduation date"
											value={item.graduationDate}
											onChange={(event) =>
												setResume((current) =>
													current
														? {
																...current,
																content: {
																	...current.content,
																	education: current.content.education.map((entry, entryIndex) =>
																		entryIndex === index
																			? { ...entry, graduationDate: event.target.value }
																			: entry,
																	),
																},
														  }
														: current,
												)
											}
										/>
									</div>
									<Textarea
										rows={3}
										placeholder="Education details (one line per bullet)"
										value={item.details.join("\n")}
										onChange={(event) =>
											setResume((current) =>
												current
													? {
															...current,
															content: {
																...current.content,
																education: current.content.education.map((entry, entryIndex) =>
																	entryIndex === index
																		? { ...entry, details: parseTextareaLines(event.target.value) }
																		: entry,
																),
															},
													  }
													: current,
											)
										}
									/>
								</div>
							))}
						</CardContent>
					</Card>

					<Card id="resume-content-projects" className={contentSectionCardClassName}>
						<CardHeader className="flex-row items-center justify-between">
							<CardTitle className="text-lg">Projects</CardTitle>
							<Button
								type="button"
								variant="outline"
									onClick={() =>
										openCreateModal({
											kind: "project",
											title: "Add project",
											subtitle: "Use the shared section item form.",
											submitLabel: "Add project",
											lockSectionTitle: true,
										}, { sectionTitle: "Projects", headerMode: "split", showSubheader: true })
									}
								>
								Add project
							</Button>
						</CardHeader>
						<CardContent className="space-y-3">
							{resume.content.projects.map((item, index) => (
								<div key={item.id} className={itemBlockClassName}>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="text-sm font-medium">Project {index + 1}</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() =>
												setResume((current) =>
													current
														? {
																...current,
																content: {
																	...current.content,
																	projects: current.content.projects.filter(
																		(_, entryIndex) => entryIndex !== index,
																	),
																},
														  }
														: current,
												)
											}
										>
											<Trash2 className="size-4" />
											Remove
										</Button>
									</div>
									<Input
										placeholder="Project name"
										value={item.name}
										onChange={(event) =>
											setResume((current) =>
												current
													? {
															...current,
															content: {
																...current.content,
																projects: current.content.projects.map((entry, entryIndex) =>
																	entryIndex === index
																		? { ...entry, name: event.target.value }
																		: entry,
																),
															},
													  }
													: current,
											)
										}
									/>
									<Textarea
										rows={3}
										placeholder="Description"
										value={item.description}
										onChange={(event) =>
											setResume((current) =>
												current
													? {
															...current,
															content: {
																...current.content,
																projects: current.content.projects.map((entry, entryIndex) =>
																	entryIndex === index
																		? { ...entry, description: event.target.value }
																		: entry,
																),
															},
													  }
												: current,
											)
										}
									/>
									<Input
										placeholder="Project URL"
										value={item.url}
										onChange={(event) =>
											setResume((current) =>
												current
													? {
															...current,
															content: {
																...current.content,
																projects: current.content.projects.map((entry, entryIndex) =>
																	entryIndex === index
																		? { ...entry, url: event.target.value }
																		: entry,
																),
															},
													  }
													: current,
											)
										}
									/>
									<Textarea
										rows={3}
										placeholder="Project highlights (one line per bullet)"
										value={item.highlights.join("\n")}
										onChange={(event) =>
											setResume((current) =>
												current
													? {
															...current,
															content: {
																...current.content,
																projects: current.content.projects.map((entry, entryIndex) =>
																	entryIndex === index
																		? {
																				...entry,
																				highlights: parseTextareaLines(event.target.value),
																		  }
																		: entry,
																),
															},
													  }
													: current,
											)
										}
									/>
								</div>
							))}
						</CardContent>
					</Card>

							{resume.content.languages.length ? (
								<Card id="resume-content-languages" className={contentSectionCardClassName}>
									<CardHeader>
										<CardTitle className="text-lg">Languages (comma separated)</CardTitle>
									</CardHeader>
								<CardContent>
									<Input
										value={languagesDraftInput}
										onChange={(event) => setLanguagesDraftInput(event.target.value)}
										onBlur={() =>
											setResume((current) =>
												current
													? {
															...current,
															content: {
																...current.content,
																languages: languagesDraftInput
																	.split(",")
																	.map((entry) => entry.trim())
																	.filter(Boolean),
															},
													  }
													: current,
											)
										}
									/>
									</CardContent>
								</Card>
							) : null}

						{structuredSectionsWithContent.map((section) => (
							<Card
								key={section.key}
								id={`resume-content-${section.key}`}
								className={contentSectionCardClassName}
							>
							<CardHeader className="flex-row items-center justify-between">
								<CardTitle className="text-lg">{section.title}</CardTitle>
								<Button
									type="button"
									variant="outline"
										onClick={() =>
											openCreateModal({
												kind: "structured",
												sectionKey: section.key,
												title: `Add ${section.title} item`,
												subtitle: "Use the shared section item form.",
												submitLabel: "Add item",
												lockSectionTitle: true,
											}, { sectionTitle: section.title, headerMode: "split", showSubheader: true })
										}
									>
									Add item
								</Button>
							</CardHeader>
							<CardContent className="space-y-3">
								{(resume.content[section.key] as ResumeStructuredListItem[]).map((item, index) => (
									<div key={item.id} className={itemBlockClassName}>
										<div className="flex flex-wrap items-center justify-between gap-2">
											<div className="text-sm font-medium">Item {index + 1}</div>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() =>
													setResume((current) =>
														current
															? {
																	...current,
																	content: {
																		...current.content,
																		[section.key]: (
																			current.content[section.key] as ResumeStructuredListItem[]
																		).filter((_, entryIndex) => entryIndex !== index),
																	},
															  }
															: current,
													)
												}
											>
												<Trash2 className="size-4" />
												Remove
											</Button>
										</div>
										<Input
											placeholder="Title"
											value={item.title}
											onChange={(event) =>
												updateListSection(section.key, index, "title", event.target.value)
											}
										/>
										<Input
											placeholder="Subtitle"
											value={item.subtitle}
											onChange={(event) =>
												updateListSection(section.key, index, "subtitle", event.target.value)
											}
										/>
										<div className="grid gap-2 md:grid-cols-2">
											<Input
												placeholder="Date"
												value={item.date}
												onChange={(event) =>
													updateListSection(section.key, index, "date", event.target.value)
												}
											/>
											<Input
												placeholder="Location"
												value={item.location}
												onChange={(event) =>
													updateListSection(section.key, index, "location", event.target.value)
												}
											/>
										</div>
										<Textarea
											rows={2}
											placeholder="Details (one line per bullet)"
											value={item.details.join("\n")}
											onChange={(event) =>
												updateListSection(section.key, index, "details", event.target.value)
											}
										/>
										<Input
											placeholder="URL"
											value={item.url}
											onChange={(event) =>
												updateListSection(section.key, index, "url", event.target.value)
											}
										/>
									</div>
								))}
								</CardContent>
							</Card>
						))}
									<Card id="resume-content-custom" className={contentSectionCardClassName}>
										<CardHeader className="flex-row items-center justify-between">
											<div>
												<CardTitle className="text-lg">Custom Sections</CardTitle>
												<CardDescription>
													Create sections with a section title, then add multiple items under them.
												</CardDescription>
											</div>
											<Button
												type="button"
												variant="outline"
												onClick={() =>
													openCreateModal(
														{
															kind: "custom",
															title: "Add custom section item",
															subtitle: "Use the same item form used by built-in sections.",
															submitLabel: "Add item",
															lockSectionTitle: false,
														},
														{ headerMode: "split", showSubheader: true },
													)
												}
											>
												Add section
											</Button>
										</CardHeader>
										<CardContent className="space-y-3">
											{customSectionGroups.map((group) => (
												<div key={group.title} className={itemBlockClassName}>
													<div className="flex flex-wrap items-center justify-between gap-2">
														<div className="text-sm font-semibold">{group.title}</div>
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={() =>
																openCreateModal(
																	{
																		kind: "custom",
																		title: `Add ${group.title} item`,
																		subtitle: "Add another item under this section title.",
																		submitLabel: "Add item",
																		lockSectionTitle: true,
																	},
																	{
																		sectionTitle: group.title,
																		headerMode: "split",
																		showSubheader: true,
																	},
																)
															}
														>
															Add item
														</Button>
													</div>
													<div className="space-y-2">
														{group.items.map((entry, itemIndex) => (
															<div
																key={entry.id}
																className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
															>
																<div className="min-w-0">
																	<div className="font-medium">Item {itemIndex + 1}</div>
																	<div className="truncate text-xs text-muted-foreground">
																		{entry.headerMode === "split"
																			? `${entry.leftHeader || "-"} | ${entry.rightHeader || "-"}`
																			: entry.leftHeader || entry.text || "No content yet"}
																	</div>
																</div>
																<Button
																	type="button"
																	variant="ghost"
																	size="sm"
																	onClick={() =>
																		setResume((current) =>
																			current
																				? {
																						...current,
																						content: {
																							...current.content,
																							customSections:
																								current.content.customSections.filter(
																									(section) => section.id !== entry.id,
																								),
																						},
																				  }
																				: current,
																		)
																	}
																>
																	<Trash2 className="size-4" />
																	Remove
																</Button>
															</div>
														))}
													</div>
												</div>
											))}
											{resume.content.customSections.length === 0 ? (
												<div className="text-sm text-muted-foreground">
													Add a custom section title and first item using the modal.
												</div>
											) : null}
										</CardContent>
									</Card>
							<div className="h-20" aria-hidden="true" />
							</div>
						</div>
					</TabsContent>

				<TabsContent value="layout" className="space-y-4">
					<Card className={editorCardClassName}>
						<CardHeader>
							<CardTitle className="text-lg">Sections</CardTitle>
							<CardDescription>
								Toggle section visibility and reorder sections.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{resume.layout.sectionOrder.map((sectionKey, index) => {
								const section = resumeSections.find((entry) => entry.key === sectionKey);
								if (!section) return null;
								const visible =
									section.key === "header"
										? true
										: Boolean(resume.layout.visibility[section.key]);
								return (
									<div
										key={section.key}
										className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/20 p-3"
									>
										<div className="flex items-center gap-2">
											<Checkbox
												checked={visible}
												disabled={section.key === "header"}
												onCheckedChange={(checked) =>
													setResume((current) =>
														current
															? {
																...current,
																layout: {
																	...current.layout,
																	visibility: {
																		...current.layout.visibility,
																		[section.key]: Boolean(checked),
																	},
																},
														  }
															: current,
													)
												}
											/>
											<div>
												<div>{section.title}</div>
												<div className="text-xs text-muted-foreground">{section.kind}</div>
											</div>
										</div>
										<div className="flex gap-1">
											<Button
												type="button"
												variant="ghost"
												size="icon"
												disabled={section.key === "header" || index === 0}
												onClick={() =>
													setResume((current) =>
														current
															? {
																...current,
																layout: {
																	...current.layout,
																	sectionOrder: moveSection(
																		current.layout.sectionOrder,
																		section.key,
																		"up",
																	),
																},
														  }
															: current,
													)
												}
											>
												<ArrowUp className="size-4" />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												disabled={
													section.key === "header" ||
													index === resume.layout.sectionOrder.length - 1
												}
												onClick={() =>
													setResume((current) =>
														current
															? {
																...current,
																layout: {
																	...current.layout,
																	sectionOrder: moveSection(
																		current.layout.sectionOrder,
																		section.key,
																		"down",
																	),
																},
														  }
															: current,
													)
												}
											>
												<ArrowDown className="size-4" />
											</Button>
										</div>
									</div>
								);
							})}
							<Button
								type="button"
								variant="secondary"
								onClick={() => setResetLayoutDialogOpen(true)}
							>
								<Shuffle className="size-4" />
								Reset to default layout
							</Button>
						</CardContent>
					</Card>
				</TabsContent>

					<TabsContent value="preview" className="space-y-4">
					<Card className={editorCardClassName}>
						<CardHeader className="gap-3">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
								<div>
									<CardTitle className="text-lg">PDF Preview (Actual Render)</CardTitle>
									<CardDescription>
										This is the real server-generated PDF output.
									</CardDescription>
								</div>
								<div className="w-full space-y-2 sm:w-[320px]">
									<Label htmlFor="resume-preview-template-key">PDF Template</Label>
									<select
										id="resume-preview-template-key"
										className="h-10 w-full rounded-xl border border-border/70 bg-background/85 px-3 text-sm"
										value={resume.templateKey}
										onChange={handleTemplateChange}
										disabled={applyTemplateMutation.isPending}
									>
										{resumeTemplateOptions.map((option) => (
											<option key={option.key} value={option.key}>
												{option.label}
											</option>
										))}
									</select>
									{applyTemplateMutation.isPending ? (
										<div className="text-xs text-muted-foreground">Applying template...</div>
									) : null}
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
								<div className="rounded-md border overflow-hidden">
									{effectivePdfInlineHref ? (
										<iframe
											title="Resume PDF Preview"
											src={effectivePdfInlineHref}
											className="h-[70dvh] min-h-[440px] w-full bg-white sm:h-[820px]"
										/>
									) : (
										<div className="flex h-[70dvh] min-h-[440px] w-full items-center justify-center bg-muted/20 p-4 sm:h-[820px]">
											<div className="max-w-md space-y-3 text-center">
												<p className="text-sm text-muted-foreground">
													Generate a preview to see your resume PDF.
												</p>
												<Button
													type="button"
													onClick={triggerGuestPreviewRefresh}
													disabled={refreshGuestPreviewMutation.isPending}
												>
													{refreshGuestPreviewMutation.isPending
														? "Generating preview..."
														: "Generate Preview"}
												</Button>
											</div>
										</div>
									)}
								</div>
							<div className="space-y-4 rounded-lg border border-border/70 bg-muted/15 p-4 sm:p-5">
								<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
									<div className="space-y-1">
										<div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
											Preview content map
										</div>
										<div className="text-sm text-muted-foreground">
											Structured content currently rendered in the PDF preview.
										</div>
									</div>
										{effectivePdfInlineHref ? (
											<a
												href={
													isGuestMode
														? effectivePdfInlineHref
														: `${apiBaseUrl}${versionPdfPath}`
												}
												target="_blank"
												rel="noreferrer noopener"
												className="text-xs underline underline-offset-2"
											>
												Open PDF in new tab
											</a>
										) : null}
								</div>
								<div className="space-y-4">
									<div className="space-y-1">
										<div className="font-semibold text-lg">{resume.content.header.fullName}</div>
										<div className="text-muted-foreground">{resume.content.header.headline}</div>
									</div>
									<div>
										<div className="font-semibold">Section order</div>
										<div className="text-muted-foreground">
											{visibleSectionOrder
												.map((entry) => sectionTitleByKey[entry])
												.join(" → ")}
										</div>
									</div>

									{visibleSectionOrder.includes("summary") && resume.content.summary ? (
										<div className="space-y-1">
											<div className="font-semibold">Summary</div>
											<div>{resume.content.summary}</div>
										</div>
									) : null}

									{visibleSectionOrder.includes("experience") &&
									resume.content.experience.length ? (
										<div className="space-y-2">
											<div className="font-semibold">Experience</div>
											{resume.content.experience.map((item) => (
												<div key={item.id} className="rounded-md border p-2">
													<div className="font-medium">
														{[item.role, item.company].filter(Boolean).join(" · ")}
													</div>
													<div className="text-xs text-muted-foreground">
														{[item.startDate, item.endDate].filter(Boolean).join(" — ")}
													</div>
													{item.bullets.length ? (
														<ul className="mt-1 list-disc space-y-1 pl-4">
															{item.bullets.map((bullet, index) => (
																<li key={`${item.id}-bullet-${index}`}>{bullet}</li>
															))}
														</ul>
													) : null}
												</div>
											))}
										</div>
									) : null}

									{visibleSectionOrder.includes("education") &&
									resume.content.education.length ? (
										<div className="space-y-2">
											<div className="font-semibold">Education</div>
											{resume.content.education.map((item) => (
												<div key={item.id} className="rounded-md border p-2">
													<div className="font-medium">
														{[item.degree, item.school].filter(Boolean).join(" · ")}
													</div>
												</div>
											))}
										</div>
									) : null}

									{visibleSectionOrder.includes("skills") &&
									resume.content.skills.length ? (
										<div className="space-y-1">
											<div className="font-semibold">Skills</div>
											{resume.templateKey === "deux_modern_v1" ? (
												<div className="space-y-1">
													{groupResumeSkills(resume.content.skills).map((group) => (
														<div key={group.category}>
															<span className="font-medium">{group.category}: </span>
															<span>{group.items.join(", ")}</span>
														</div>
													))}
												</div>
											) : (
												<div>{resume.content.skills.join(", ")}</div>
											)}
										</div>
									) : null}

									{visibleSectionOrder.includes("projects") &&
									resume.content.projects.length ? (
										<div className="space-y-2">
											<div className="font-semibold">Projects</div>
											{resume.content.projects.map((item) => (
												<div key={item.id} className="rounded-md border p-2">
													<div className="font-medium">{item.name}</div>
													{item.description ? <div>{item.description}</div> : null}
												</div>
											))}
										</div>
									) : null}

									{visibleSectionOrder.includes("custom") &&
									resume.content.customSections.length ? (
										<div className="space-y-2">
											<div className="font-semibold">Custom Sections</div>
											{resume.content.customSections.map((section) => (
												<div key={section.id} className="rounded-md border p-2">
													<div className="font-medium">{section.title || "Custom"}</div>
													{section.bodyMode === "text" ? (
														<div>{section.text}</div>
													) : null}
													{section.bodyMode === "bullets" ? (
														<ul className="mt-1 list-disc space-y-1 pl-4">
															{section.bullets.map((bullet, index) => (
																<li key={`${section.id}-bullet-${index}`}>{bullet}</li>
															))}
														</ul>
													) : null}
													{section.bodyMode === "categories" ? (
														<div className="space-y-1">
															{section.categories.map((row) => (
																<div key={row.id}>
																	<span className="font-medium">
																		{row.category}
																		{row.category ? ": " : ""}
																	</span>
																	<span>{row.values.join(", ")}</span>
																</div>
															))}
														</div>
													) : null}
												</div>
											))}
										</div>
									) : null}

									{visibleSectionOrder.includes("languages") &&
									resume.content.languages.length ? (
										<div className="space-y-1">
											<div className="font-semibold">Languages</div>
											<div>{resume.content.languages.join(", ")}</div>
										</div>
									) : null}
								</div>
							</div>
						</CardContent>
					</Card>
					</TabsContent>
				</Tabs>

			{!previewOpen ? (
				<div className="fixed right-4 bottom-24 z-30 xl:hidden">
					<Button type="button" size="sm" className="shadow-md" onClick={openPreviewModal}>
						<Eye className="size-4" />
						Preview
					</Button>
				</div>
			) : null}

			{!isGuestMode && !previewOpen ? (
				<div
					className="pointer-events-none fixed z-30 hidden xl:block"
					style={
						isFloatingPreviewMinimized
							? {
									right: "1rem",
									bottom: "1rem",
								}
							: floatingPreviewPosition
								? {
										left: `${floatingPreviewPosition.x}px`,
										top: `${floatingPreviewPosition.y}px`,
									}
								: {
										left: `${FLOATING_PREVIEW_MIN_OFFSET}px`,
										top: `${FLOATING_PREVIEW_MIN_TOP}px`,
								}
					}
				>
					{isFloatingPreviewMinimized ? (
						<div className="pointer-events-auto">
							<Button
								type="button"
								size="sm"
								variant="outline"
								className="w-auto"
								onClick={() => setIsFloatingPreviewMinimized(false)}
							>
								<Eye className="size-4" />
								Show preview
							</Button>
						</div>
					) : (
						<div className="pointer-events-auto">
							<div
								className={`v2-preview-frame w-[18rem] overflow-hidden p-2.5 select-none ${
									isFloatingPreviewDragging ? "cursor-grabbing" : "cursor-grab"
								}`}
								onPointerDown={handleFloatingPreviewPointerDown}
								onPointerMove={handleFloatingPreviewPointerMove}
								onPointerUp={stopFloatingPreviewDrag}
								onPointerCancel={stopFloatingPreviewDrag}
							>
								<div className="mb-2 flex items-center justify-between gap-2 px-1">
									<div>
										<div className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground">
											LIVE PDF PREVIEW
										</div>
										<div className="text-xs text-muted-foreground">Drag to move</div>
									</div>
									<div className="flex items-center gap-1">
										<Button
											type="button"
											size="sm"
											variant="outline"
											className="px-2"
											onClick={() => setIsFloatingPreviewMinimized(true)}
											aria-label="Minimize preview"
											title="Minimize preview"
										>
											<EyeOff className="size-4" />
										</Button>
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={openPreviewModal}
										>
											Fullscreen
										</Button>
									</div>
								</div>
								<div className="h-[13rem] overflow-y-auto overflow-x-hidden overscroll-contain rounded-lg border border-border/70 bg-background/85 p-2">
									<div className="origin-top-left scale-[0.255]">
										<div className="w-[980px] bg-white">
											<iframe
												title="Resume PDF Floating Preview"
												src={pdfInlineHref}
												className="pointer-events-none h-[1280px] w-full bg-white"
											/>
										</div>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			) : null}

			{previewOpen ? (
				<div className="fixed inset-0 z-50 bg-black/60 p-2 sm:p-6">
					<div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl sm:rounded-xl">
						<div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
							<div>
								<div className="text-sm font-semibold">Quick preview</div>
								<div className="text-xs text-muted-foreground">
									Live PDF output with current unsaved editor state.
								</div>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={closePreview}
							>
								Close
							</Button>
						</div>
						<div className="flex-1 min-h-0 overflow-hidden p-3 sm:p-4">
							<div className="h-full overflow-hidden rounded-md border">
								{effectivePdfInlineHref ? (
									<iframe
										title="Resume PDF Preview Modal"
										src={effectivePdfInlineHref}
										className="h-full w-full bg-white"
									/>
								) : (
									<div className="flex h-full items-center justify-center bg-muted/20 p-4">
										<div className="space-y-3 text-center">
											<div className="text-sm text-muted-foreground">
												Generate preview to see your resume PDF.
											</div>
											<Button
												type="button"
												onClick={triggerGuestPreviewRefresh}
												disabled={refreshGuestPreviewMutation.isPending}
											>
												{refreshGuestPreviewMutation.isPending
													? "Generating preview..."
													: "Generate Preview"}
											</Button>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			) : null}

			{versionToCreate ? (
				<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-4 sm:items-center sm:py-6">
					<Card className="flex max-h-[85vh] w-full max-w-lg flex-col border-border/70 shadow-xl">
						<CardHeader>
							<CardTitle className="text-lg">Create new version</CardTitle>
							<CardDescription>
								Choose the base source, then set the version name.
							</CardDescription>
						</CardHeader>
						<CardContent className="min-h-0 space-y-4 overflow-y-auto">
							<div className="space-y-2">
								<div className="text-sm font-medium">Version name</div>
								<Input
									value={versionToCreate.name}
									onChange={(event) =>
										setVersionToCreate((current) =>
											current
												? { ...current, name: event.target.value, error: "" }
												: current,
										)
									}
									maxLength={120}
									placeholder="e.g. Product Role Variant"
								/>
							</div>
							<div className="space-y-2">
								<div className="text-sm font-medium">Base this version on</div>
								<div className="space-y-2">
									{versionBaseOptions.map((option) => (
										<button
											key={option.value}
											type="button"
											className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
												versionToCreate.base === option.value
													? "border-emerald-500/50 bg-emerald-500/10"
													: "border-border hover:bg-muted/40"
											}`}
											onClick={() =>
												setVersionToCreate((current) =>
													current ? { ...current, base: option.value } : current,
												)
											}
										>
											<div className="text-sm font-medium">{option.label}</div>
											<div className="text-xs text-muted-foreground">
												{option.description}
											</div>
										</button>
									))}
								</div>
							</div>
							{versionToCreate.error ? (
								<div className="text-sm text-destructive">{versionToCreate.error}</div>
							) : null}
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setVersionToCreate(null)}
									disabled={createVersionMutation.isPending}
								>
									Cancel
								</Button>
								<Button
									type="button"
									onClick={handleCreateVersionConfirm}
									disabled={createVersionMutation.isPending}
								>
									{createVersionMutation.isPending ? "Creating..." : "Create version"}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			) : null}

			{renameDialogOpen && canManageSelectedDraftVersion ? (
				<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-4 sm:items-center sm:py-6">
					<Card className="flex max-h-[85vh] w-full max-w-md flex-col border-border/70 shadow-xl">
						<CardHeader>
							<CardTitle className="text-lg">Rename version</CardTitle>
							<CardDescription>Update the version name.</CardDescription>
						</CardHeader>
						<CardContent className="min-h-0 space-y-3 overflow-y-auto">
							<Input
								value={renameValue}
								onChange={(event) => setRenameValue(event.target.value)}
								maxLength={120}
								placeholder="Version name"
							/>
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setRenameDialogOpen(false)}
									disabled={renameVersionMutation.isPending}
								>
									Cancel
								</Button>
								<Button
									type="button"
									onClick={() => {
										const nextName = renameValue.trim();
										if (!nextName) {
											setToast({
												type: "error",
												message: "Version name is required.",
											});
											return;
										}
										renameVersionMutation.mutate(nextName);
									}}
									disabled={renameVersionMutation.isPending}
								>
									{renameVersionMutation.isPending ? "Saving..." : "Save name"}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			) : null}

			{deleteDialogOpen && canManageSelectedDraftVersion ? (
				<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-4 sm:items-center sm:py-6">
					<Card className="flex max-h-[85vh] w-full max-w-md flex-col border-border/70 shadow-xl">
						<CardHeader>
							<CardTitle className="text-lg">Delete version?</CardTitle>
							<CardDescription>
								Delete this version? This cannot be undone.
							</CardDescription>
						</CardHeader>
						<CardContent className="min-h-0 overflow-y-auto">
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setDeleteDialogOpen(false)}
									disabled={deleteVersionMutation.isPending}
								>
									Cancel
								</Button>
								<Button
									type="button"
									variant="destructive"
									onClick={() => deleteVersionMutation.mutate()}
									disabled={deleteVersionMutation.isPending}
								>
									{deleteVersionMutation.isPending ? "Deleting..." : "Delete"}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			) : null}

			{createModal ? (
				<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-4 sm:items-center sm:py-6">
						<Card className="flex max-h-[88vh] w-full max-w-lg flex-col border-border/70 shadow-xl">
							<CardHeader>
								<CardTitle className="text-lg">{createModal.title}</CardTitle>
								<CardDescription>{createModal.subtitle}</CardDescription>
							</CardHeader>
								<CardContent className="min-h-0 space-y-3 overflow-y-auto text-sm">
									{(() => {
										const labels = getCreateModalLabels(createModal.kind);
										return (
											<>
												<div className="space-y-2">
													<Label>Section title</Label>
													<Input
														placeholder="Section title"
														value={createForm.sectionTitle}
														disabled={Boolean(createModal.lockSectionTitle)}
														onChange={(event) =>
															setCreateForm((current) => ({
																...current,
																sectionTitle: event.target.value,
															}))
														}
													/>
												</div>
												<div className="grid gap-2 sm:grid-cols-2">
													<div className="space-y-2">
														<Label>Header mode</Label>
														<select
															className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
															value={createForm.headerMode}
															onChange={(event) =>
																setCreateForm((current) => ({
																	...current,
																	headerMode:
																		event.target.value as ResumeDynamicSectionHeaderMode,
																	showSubheader:
																		event.target.value === "split"
																			? true
																			: current.showSubheader,
																}))
															}
														>
															<option value="none">No split header</option>
															<option value="split">Split header (left/right)</option>
														</select>
													</div>
													{createForm.headerMode === "split" ? (
														<div className="space-y-2">
															<Label>Subheader row</Label>
															<div className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2">
																<Checkbox
																	checked={createForm.showSubheader}
																	onCheckedChange={(checked) =>
																		setCreateForm((current) => ({
																			...current,
																			showSubheader: Boolean(checked),
																		}))
																	}
																/>
																<span className="text-xs text-muted-foreground">
																	Include left/right subheader row
																</span>
															</div>
														</div>
													) : null}
												</div>
												<div className="grid gap-2 sm:grid-cols-2">
													<Input
														placeholder={labels.leftHeader}
														value={createForm.leftHeader}
													onChange={(event) =>
														setCreateForm((current) => ({
															...current,
															leftHeader: event.target.value,
														}))
													}
												/>
												<Input
													placeholder={labels.rightHeader}
													value={createForm.rightHeader}
													onChange={(event) =>
														setCreateForm((current) => ({
															...current,
															rightHeader: event.target.value,
															}))
														}
													/>
													{createForm.headerMode === "split" ? (
														<>
															<Input
																placeholder={labels.leftSubheader}
																value={createForm.leftSubheader}
																onChange={(event) =>
																	setCreateForm((current) => ({
																		...current,
																		leftSubheader: event.target.value,
																	}))
																}
															/>
															<Input
																placeholder={labels.rightSubheader}
																value={createForm.rightSubheader}
																onChange={(event) =>
																	setCreateForm((current) => ({
																		...current,
																		rightSubheader: event.target.value,
																	}))
																}
															/>
														</>
													) : null}
												</div>
											<div className="space-y-2">
												<Label>Body mode</Label>
												<select
													className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
													value={createForm.bodyMode}
													onChange={(event) =>
														setCreateForm((current) => ({
															...current,
															bodyMode: event.target.value as "text" | "bullets" | "categories",
														}))
													}
												>
													<option value="bullets">Bullet points</option>
													<option value="text">Simple text</option>
													<option value="categories">Category + values</option>
												</select>
											</div>
											{createForm.bodyMode === "text" ? (
												<Textarea
													rows={4}
													placeholder={`${labels.body} (plain text)`}
													value={createForm.text}
													onChange={(event) =>
														setCreateForm((current) => ({
															...current,
															text: event.target.value,
														}))
													}
												/>
											) : null}
											{createForm.bodyMode === "bullets" ? (
												<Textarea
													rows={4}
													placeholder={`${labels.body} (one per line)`}
													value={createForm.bulletsText}
													onChange={(event) =>
														setCreateForm((current) => ({
															...current,
															bulletsText: event.target.value,
														}))
													}
												/>
											) : null}
											{createForm.bodyMode === "categories" ? (
												<div className="space-y-2">
													{createForm.categories.map((row) => (
														<div key={row.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
															<Input
																placeholder="Category"
																value={row.category}
																onChange={(event) =>
																	setCreateForm((current) => ({
																		...current,
																		categories: current.categories.map((entry) =>
																			entry.id === row.id
																				? { ...entry, category: event.target.value }
																				: entry,
																		),
																	}))
																}
															/>
															<Input
																placeholder="Value 1, Value 2"
																value={row.valuesText}
																onChange={(event) =>
																	setCreateForm((current) => ({
																		...current,
																		categories: current.categories.map((entry) =>
																			entry.id === row.id
																				? { ...entry, valuesText: event.target.value }
																				: entry,
																		),
																	}))
																}
															/>
															<Button
																type="button"
																variant="ghost"
																size="icon"
																onClick={() =>
																	setCreateForm((current) => ({
																		...current,
																		categories:
																			current.categories.length <= 1
																				? current.categories
																				: current.categories.filter((entry) => entry.id !== row.id),
																	}))
																}
															>
																<Trash2 className="size-4" />
															</Button>
														</div>
													))}
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={() =>
															setCreateForm((current) => ({
																...current,
																categories: [
																	...current.categories,
																	{ id: makeId(), category: "", valuesText: "" },
																],
															}))
														}
													>
														Add category row
													</Button>
												</div>
											) : null}
										</>
									);
								})()}

							<div className="flex justify-end gap-2 pt-2">
								<Button type="button" variant="outline" onClick={closeCreateModal}>
									Cancel
								</Button>
								<Button type="button" onClick={submitCreateModal}>
									{createModal.submitLabel}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			) : null}

			{shortcutsOpen ? (
				<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-4 sm:items-center sm:py-6">
					<Card className="flex max-h-[85vh] w-full max-w-md flex-col border-border/70 shadow-xl">
						<CardHeader>
							<CardTitle className="text-lg">Keyboard shortcuts</CardTitle>
							<CardDescription>Productivity shortcuts for Resume Builder.</CardDescription>
						</CardHeader>
						<CardContent className="min-h-0 space-y-2 overflow-y-auto text-sm">
							<div className="flex items-center justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-2">
								<span>Save resume</span>
								<code className="text-xs">Ctrl/Cmd + S</code>
							</div>
							<div className="flex items-center justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-2">
								<span>Open quick preview</span>
								<code className="text-xs">Ctrl/Cmd + Shift + P</code>
							</div>
							<div className="flex items-center justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-2">
								<span>Close popups</span>
								<code className="text-xs">Esc</code>
							</div>
							<div className="flex justify-end pt-2">
								<Button type="button" variant="outline" onClick={() => setShortcutsOpen(false)}>
									Close
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			) : null}

			{resetLayoutDialogOpen ? (
				<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-4 sm:items-center sm:py-6">
					<Card className="flex max-h-[85vh] w-full max-w-md flex-col border-border/70 shadow-xl">
						<CardHeader>
							<CardTitle className="text-lg">Reset section layout?</CardTitle>
							<CardDescription>
								This restores default section order and visibility preferences.
							</CardDescription>
						</CardHeader>
						<CardContent className="min-h-0 overflow-y-auto">
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setResetLayoutDialogOpen(false)}
								>
									Cancel
								</Button>
								<Button
									type="button"
									variant="destructive"
									onClick={() => {
										setResume((current) => (current ? resetResumeLayout(current) : current));
										setResetLayoutDialogOpen(false);
									}}
								>
									Reset
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			) : null}
		</main>
	);
}
