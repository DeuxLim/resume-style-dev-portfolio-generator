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
	getResumeValidation,
	groupResumeSkills,
	moveSection,
	resetResumeLayout,
	resumeSections,
} from "@/lib/resume";
import type {
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
	ChevronDown,
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
	key: "certifications" | "awards" | "volunteer" | "publications" | "custom";
	title: string;
}> = [
	{ key: "certifications", title: "Certifications" },
	{ key: "awards", title: "Awards" },
	{ key: "volunteer", title: "Volunteer" },
	{ key: "publications", title: "Publications" },
	{ key: "custom", title: "Custom" },
];

const resumeTemplateOptions: Array<{ key: ResumeTemplateKey; label: string }> = [
	{ key: "ats_classic_v1", label: "ATS Classic (Default)" },
	{ key: "harvard_classic_v1", label: "Harvard Classic" },
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
type ResumeCreateModalKind = "experience" | "education" | "project" | "structured";
type ResumeCreateModalState = {
	kind: ResumeCreateModalKind;
	title: string;
	subtitle: string;
	sectionKey?: StructuredSectionKey;
	submitLabel: string;
};
type ResumeCreateFormState = {
	experienceRole: string;
	experienceCompany: string;
	experienceLocation: string;
	experienceStartDate: string;
	experienceEndDate: string;
	experienceBullets: string;
	educationDegree: string;
	educationSchool: string;
	educationLocation: string;
	educationGraduationDate: string;
	educationDetails: string;
	projectName: string;
	projectDescription: string;
	projectUrl: string;
	projectHighlights: string;
	structuredTitle: string;
	structuredSubtitle: string;
	structuredDate: string;
	structuredLocation: string;
	structuredDetails: string;
	structuredUrl: string;
};
type SkillCategoryDraft = {
	id: string;
	category: string;
	skillsText: string;
};
const makeCreateFormDefaults = (): ResumeCreateFormState => ({
	experienceRole: "",
	experienceCompany: "",
	experienceLocation: "",
	experienceStartDate: "",
	experienceEndDate: "",
	experienceBullets: "",
	educationDegree: "",
	educationSchool: "",
	educationLocation: "",
	educationGraduationDate: "",
	educationDetails: "",
	projectName: "",
	projectDescription: "",
	projectUrl: "",
	projectHighlights: "",
	structuredTitle: "",
	structuredSubtitle: "",
	structuredDate: "",
	structuredLocation: "",
	structuredDetails: "",
	structuredUrl: "",
});
const parseTextareaLines = (value: string) =>
	value
		.split("\n")
		.map((entry) => entry.trim())
		.filter(Boolean);

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
				fullName: "",
				headline: "",
				location: "",
				email: "",
			},
			summary: "",
			experience: [],
			education: [],
			skills: [],
			projects: [],
			certifications: [],
			awards: [],
			volunteer: [],
			languages: [],
			publications: [],
			custom: [],
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
	const [isValidationSummaryExpanded, setIsValidationSummaryExpanded] = useState(false);
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

	const liveValidation = useMemo(
		() => (resume ? getResumeValidation(resume) : null),
		[resume],
	);

	const summaryWarnings = useMemo(() => {
		if (!resume) return [];
		const warnings: string[] = [];
		if (resume.content.summary.length > 300) {
			warnings.push("Summary is longer than recommended (300 chars).");
		}
		if (resume.content.summary.length > 600) {
			warnings.push("Summary exceeds max length (600 chars).");
		}
		return warnings;
	}, [resume?.content.summary]);

	const skillsWarnings = useMemo(() => {
		if (!resume) return [];
		const warnings: string[] = [];
		const count = serializeSkillCategoryDrafts(skillCategoryDrafts).length;
		if (count < 8 || count > 24) {
			warnings.push("8-24 skills is recommended.");
		}
		if (count > 40) {
			warnings.push("Skills exceed max (40).");
		}
		return warnings;
	}, [resume?.content.skills, skillCategoryDrafts]);

	const contentSectionNav = useMemo(
		() => [
			{ id: "resume-content-header", label: "Header" },
			{ id: "resume-content-summary", label: "Summary" },
			{ id: "resume-content-skills", label: "Skills" },
			{ id: "resume-content-experience", label: "Experience" },
			{ id: "resume-content-education", label: "Education" },
			{ id: "resume-content-projects", label: "Projects" },
			{ id: "resume-content-languages", label: "Languages" },
			...listSections.map((section) => ({
				id: `resume-content-${section.key}`,
				label: section.title,
			})),
		],
		[],
	);

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
			let message = "Failed to generate PDF.";
			const payload = axiosError.response?.data;
			if (payload instanceof Blob) {
				try {
					const text = await payload.text();
					const parsed = JSON.parse(text) as { message?: string };
					if (parsed?.message) {
						message = parsed.message;
					}
				} catch {
					// Ignore parse failures and keep generic fallback.
				}
			}
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
			let message = "Failed to refresh preview.";
			const payload = axiosError.response?.data;
			if (payload instanceof Blob) {
				try {
					const text = await payload.text();
					const parsed = JSON.parse(text) as { message?: string };
					if (parsed?.message) {
						message = parsed.message;
					}
				} catch {
					// Keep fallback message for non-JSON payloads.
				}
			}
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
				if (isGuestMode) return;
				setPreviewOpen(true);
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
			: "ats_classic_v1";
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

	const renderInlineWarnings = (messages: string[]) => {
		if (!messages.length) return null;
		return (
			<ul className="mt-2 list-disc pl-5 text-xs text-amber-600 space-y-1">
				{messages.map((message, index) => (
					<li key={`${message}-${index}`}>{message}</li>
				))}
			</ul>
		);
	};

	const getExperienceWarnings = (bullets: string[]) => {
		const warnings: string[] = [];
		if (bullets.length < 3 || bullets.length > 6) {
			warnings.push("3-6 bullets per role is recommended.");
		}
		if (bullets.length > 8) {
			warnings.push("Max 8 bullets per role.");
		}
		if (bullets.some((bullet) => bullet.length > 140)) {
			warnings.push("One or more bullets are longer than recommended (140 chars).");
		}
		if (bullets.some((bullet) => bullet.length > 220)) {
			warnings.push("One or more bullets exceed max length (220 chars).");
		}
		return warnings;
	};

	const getCustomWarnings = (details: string[]) => {
		const body = details.join(" ").trim();
		const warnings: string[] = [];
		if (!body) return warnings;
		if (body.length > 300) {
			warnings.push("Custom details are longer than recommended (300 chars).");
		}
		if (body.length > 500) {
			warnings.push("Custom details exceed max length (500 chars).");
		}
		return warnings;
	};

	const setHeaderField = (key: keyof ResumeRecord["content"]["header"], value: string) => {
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

	const updateListSection = (
		section: keyof ResumeRecord["content"],
		index: number,
		field: keyof ResumeStructuredListItem,
		value: string,
	) => {
		setResume((current) => {
			if (!current) return current;
			const nextItems = [...(current.content[section] as ResumeStructuredListItem[])];
			const target = nextItems[index];
			if (!target) return current;
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

	const openCreateModal = (modal: ResumeCreateModalState) => {
		setCreateForm(makeCreateFormDefaults());
		setCreateModal(modal);
	};

	const submitCreateModal = () => {
		if (!createModal) return;
		setResume((current) => {
			if (!current) return current;
			switch (createModal.kind) {
				case "experience":
					return {
						...current,
						content: {
							...current.content,
							experience: [
								...current.content.experience,
								{
									id: makeId(),
									role: createForm.experienceRole.trim(),
									company: createForm.experienceCompany.trim(),
									location: createForm.experienceLocation.trim(),
									startDate: createForm.experienceStartDate.trim(),
									endDate: createForm.experienceEndDate.trim(),
									isCurrent: false,
									bullets: parseTextareaLines(createForm.experienceBullets),
								},
							],
						},
					};
				case "education":
					return {
						...current,
						content: {
							...current.content,
							education: [
								...current.content.education,
								{
									id: makeId(),
									school: createForm.educationSchool.trim(),
									degree: createForm.educationDegree.trim(),
									location: createForm.educationLocation.trim(),
									graduationDate: createForm.educationGraduationDate.trim(),
									details: parseTextareaLines(createForm.educationDetails),
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
									name: createForm.projectName.trim(),
									description: createForm.projectDescription.trim(),
									url: createForm.projectUrl.trim(),
									highlights: parseTextareaLines(createForm.projectHighlights),
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
									title: createForm.structuredTitle.trim(),
									subtitle: createForm.structuredSubtitle.trim(),
									date: createForm.structuredDate.trim(),
									location: createForm.structuredLocation.trim(),
									details: parseTextareaLines(createForm.structuredDetails),
									url: createForm.structuredUrl.trim(),
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
							{!isGuestMode ? (
								<Button
									type="button"
									variant="outline"
									className="w-full justify-start"
									onClick={() => {
										setMobileActionsOpen(false);
										setPreviewOpen(true);
									}}
								>
									<Eye className="size-4" />
									Open Preview
								</Button>
							) : null}
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
						<CardContent className="grid gap-3 md:grid-cols-2">
								<div className="space-y-2">
									<Label>Full name</Label>
									<Input
										value={resume.content.header.fullName}
										onChange={(event) => setHeaderField("fullName", event.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>Headline</Label>
									<Input
										value={resume.content.header.headline}
										onChange={(event) => setHeaderField("headline", event.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>Email</Label>
									<Input
										value={resume.content.header.email}
										onChange={(event) => setHeaderField("email", event.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>Phone</Label>
									<Input
										value={resume.content.header.phone}
										onChange={(event) => setHeaderField("phone", event.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>Location</Label>
									<Input
										value={resume.content.header.location}
										onChange={(event) => setHeaderField("location", event.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>Website URL</Label>
									<Input
										value={resume.content.header.websiteUrl}
										onChange={(event) => setHeaderField("websiteUrl", event.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>LinkedIn URL</Label>
									<Input
										value={resume.content.header.linkedinUrl}
										onChange={(event) => setHeaderField("linkedinUrl", event.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>GitHub URL</Label>
									<Input
										value={resume.content.header.githubUrl}
										onChange={(event) => setHeaderField("githubUrl", event.target.value)}
									/>
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
							{renderInlineWarnings(summaryWarnings)}
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
								{renderInlineWarnings(skillsWarnings)}
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
										subtitle: "Create a role entry before editing details inline.",
										submitLabel: "Add role",
									})
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
									{renderInlineWarnings(getExperienceWarnings(item.bullets))}
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
										subtitle: "Start with the core details, then refine in the editor.",
										submitLabel: "Add education",
									})
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
										subtitle: "Capture the project basics before polishing content.",
										submitLabel: "Add project",
									})
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

					{listSections.map((section) => (
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
											subtitle: "Use this modal to create a structured item.",
											submitLabel: "Add item",
										})
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
										{section.key === "custom"
											? renderInlineWarnings(getCustomWarnings(item.details))
											: null}
									</div>
								))}
							</CardContent>
						</Card>
					))}
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
						<button
							type="button"
							className="flex w-full items-center gap-4 px-5 py-3 text-left"
							onClick={() => setIsValidationSummaryExpanded((current) => !current)}
							aria-expanded={isValidationSummaryExpanded}
							aria-controls="resume-validation-summary-details"
						>
							<span className="text-lg font-medium">Validation summary</span>
							<div className="ml-auto flex items-center gap-3 text-sm">
								<span
									className={
										liveValidation?.errors.length
											? "whitespace-nowrap font-medium text-rose-600"
											: "whitespace-nowrap font-medium text-emerald-600"
									}
								>
									Errors: {liveValidation?.errors.length ?? 0}
								</span>
								<span
									className={
										liveValidation?.warnings.length
											? "whitespace-nowrap font-medium text-amber-600"
											: "whitespace-nowrap font-medium text-emerald-600"
									}
								>
									Warnings: {liveValidation?.warnings.length ?? 0}
								</span>
							</div>
							<ChevronDown
								className={`size-4 text-muted-foreground transition-transform ${
									isValidationSummaryExpanded ? "rotate-180" : ""
								}`}
							/>
						</button>
						{isValidationSummaryExpanded ? (
							<CardContent id="resume-validation-summary-details" className="space-y-2 pt-0">
								<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
									Warnings are advisory only. You can still create/save your resume.
									Only hard errors block PDF export.
								</div>
								<div className="text-sm font-medium">Errors</div>
								{liveValidation?.errors.length ? (
									<ul className="list-disc space-y-1 pl-5 text-sm text-rose-600">
										{liveValidation.errors.map((error) => (
											<li key={error.code + error.message}>{error.message}</li>
										))}
									</ul>
								) : (
									<div className="text-sm text-emerald-600">No hard errors.</div>
								)}
								<div className="pt-2 text-sm font-medium">Warnings</div>
								{liveValidation?.warnings.length ? (
									<ul className="list-disc space-y-1 pl-5 text-sm text-amber-600">
										{liveValidation.warnings.map((warning) => (
											<li key={warning.code + warning.message}>{warning.message}</li>
										))}
									</ul>
								) : (
									<div className="text-sm text-emerald-600">No warnings.</div>
								)}
							</CardContent>
						) : null}
					</Card>

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
											onClick={() => setPreviewOpen(true)}
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

			{!isGuestMode && previewOpen ? (
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
								<iframe
									title="Resume PDF Preview Modal"
									src={pdfInlineHref}
									className="h-full w-full bg-white"
								/>
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
							{createModal.kind === "experience" ? (
								<>
									<div className="grid gap-2 sm:grid-cols-2">
										<Input
											placeholder="Role"
											value={createForm.experienceRole}
											onChange={(event) =>
												setCreateForm((current) => ({
													...current,
													experienceRole: event.target.value,
												}))
											}
										/>
										<Input
											placeholder="Company"
											value={createForm.experienceCompany}
											onChange={(event) =>
												setCreateForm((current) => ({
													...current,
													experienceCompany: event.target.value,
												}))
											}
										/>
										<Input
											placeholder="Location"
											value={createForm.experienceLocation}
											onChange={(event) =>
												setCreateForm((current) => ({
													...current,
													experienceLocation: event.target.value,
												}))
											}
										/>
										<Input
											placeholder="Start date"
											value={createForm.experienceStartDate}
											onChange={(event) =>
												setCreateForm((current) => ({
													...current,
													experienceStartDate: event.target.value,
												}))
											}
										/>
									</div>
									<Input
										placeholder="End date"
										value={createForm.experienceEndDate}
										onChange={(event) =>
											setCreateForm((current) => ({
												...current,
												experienceEndDate: event.target.value,
											}))
										}
									/>
									<Textarea
										rows={4}
										placeholder="Bullets (one per line)"
										value={createForm.experienceBullets}
										onChange={(event) =>
											setCreateForm((current) => ({
												...current,
												experienceBullets: event.target.value,
											}))
										}
									/>
								</>
							) : null}

							{createModal.kind === "education" ? (
								<>
									<div className="grid gap-2 sm:grid-cols-2">
										<Input
											placeholder="Degree"
											value={createForm.educationDegree}
											onChange={(event) =>
												setCreateForm((current) => ({
													...current,
													educationDegree: event.target.value,
												}))
											}
										/>
										<Input
											placeholder="School"
											value={createForm.educationSchool}
											onChange={(event) =>
												setCreateForm((current) => ({
													...current,
													educationSchool: event.target.value,
												}))
											}
										/>
										<Input
											placeholder="Location"
											value={createForm.educationLocation}
											onChange={(event) =>
												setCreateForm((current) => ({
													...current,
													educationLocation: event.target.value,
												}))
											}
										/>
										<Input
											placeholder="Graduation date"
											value={createForm.educationGraduationDate}
											onChange={(event) =>
												setCreateForm((current) => ({
													...current,
													educationGraduationDate: event.target.value,
												}))
											}
										/>
									</div>
									<Textarea
										rows={3}
										placeholder="Details (one per line)"
										value={createForm.educationDetails}
										onChange={(event) =>
											setCreateForm((current) => ({
												...current,
												educationDetails: event.target.value,
											}))
										}
									/>
								</>
							) : null}

							{createModal.kind === "project" ? (
								<>
									<Input
										placeholder="Project name"
										value={createForm.projectName}
										onChange={(event) =>
											setCreateForm((current) => ({
												...current,
												projectName: event.target.value,
											}))
										}
									/>
									<Textarea
										rows={3}
										placeholder="Description"
										value={createForm.projectDescription}
										onChange={(event) =>
											setCreateForm((current) => ({
												...current,
												projectDescription: event.target.value,
											}))
										}
									/>
									<Input
										placeholder="Project URL"
										value={createForm.projectUrl}
										onChange={(event) =>
											setCreateForm((current) => ({
												...current,
												projectUrl: event.target.value,
											}))
										}
									/>
									<Textarea
										rows={3}
										placeholder="Highlights (one per line)"
										value={createForm.projectHighlights}
										onChange={(event) =>
											setCreateForm((current) => ({
												...current,
												projectHighlights: event.target.value,
											}))
										}
									/>
								</>
							) : null}

							{createModal.kind === "structured" ? (
								<>
									<div className="grid gap-2 sm:grid-cols-2">
										<Input
											placeholder="Title"
											value={createForm.structuredTitle}
											onChange={(event) =>
												setCreateForm((current) => ({
													...current,
													structuredTitle: event.target.value,
												}))
											}
										/>
										<Input
											placeholder="Subtitle"
											value={createForm.structuredSubtitle}
											onChange={(event) =>
												setCreateForm((current) => ({
													...current,
													structuredSubtitle: event.target.value,
												}))
											}
										/>
										<Input
											placeholder="Date"
											value={createForm.structuredDate}
											onChange={(event) =>
												setCreateForm((current) => ({
													...current,
													structuredDate: event.target.value,
												}))
											}
										/>
										<Input
											placeholder="Location"
											value={createForm.structuredLocation}
											onChange={(event) =>
												setCreateForm((current) => ({
													...current,
													structuredLocation: event.target.value,
												}))
											}
										/>
									</div>
									<Input
										placeholder="URL"
										value={createForm.structuredUrl}
										onChange={(event) =>
											setCreateForm((current) => ({
												...current,
												structuredUrl: event.target.value,
											}))
										}
									/>
									<Textarea
										rows={3}
										placeholder="Details (one per line)"
										value={createForm.structuredDetails}
										onChange={(event) =>
											setCreateForm((current) => ({
												...current,
												structuredDetails: event.target.value,
											}))
										}
									/>
								</>
							) : null}

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
