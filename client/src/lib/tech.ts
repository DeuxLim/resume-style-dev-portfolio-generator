import type { IconType } from "react-icons";
import { BsClaude } from "react-icons/bs";
import { FaAws, FaMicrosoft } from "react-icons/fa6";
import {
	SiAngular,
	SiApollographql,
	SiBootstrap,
	SiCloudflare,
	SiCss,
	SiCypress,
	SiDjango,
	SiDocker,
	SiDotnet,
	SiEslint,
	SiExpress,
	SiFastapi,
	SiFirebase,
	SiFlask,
	SiFlutter,
	SiGit,
	SiGithub,
	SiGithubactions,
	SiGitlab,
	SiGo,
	SiGooglecloud,
	SiGraphql,
	SiHtml5,
	SiHuggingface,
	SiJavascript,
	SiJest,
	SiKotlin,
	SiKubernetes,
	SiLangchain,
	SiLaravel,
	SiMongodb,
	SiMui,
	SiMysql,
	SiNestjs,
	SiNetlify,
	SiNextdotjs,
	SiNginx,
	SiNodedotjs,
	SiNpm,
	SiNuxt,
	SiOpenai,
	SiOpenjdk,
	SiPhp,
	SiPnpm,
	SiPostgresql,
	SiPostman,
	SiPrettier,
	SiPrisma,
	SiPython,
	SiReact,
	SiRedis,
	SiRedux,
	SiRemix,
	SiRubyonrails,
	SiRust,
	SiSass,
	SiSelenium,
	SiSpringboot,
	SiSqlite,
	SiSupabase,
	SiSvelte,
	SiSwift,
	SiTailwindcss,
	SiTypescript,
	SiVercel,
	SiVite,
	SiVitest,
	SiVuedotjs,
	SiWebpack,
	SiYarn,
} from "react-icons/si";
import { VscVscode } from "react-icons/vsc";

type TechGroup =
	| "frontend"
	| "backend"
	| "database"
	| "devops"
	| "cloud"
	| "ai"
	| "mobile"
	| "testing"
	| "tooling"
	| "others";

type TechIconEntry = {
	label: string;
	aliases: string[];
	className: string;
	group: TechGroup;
	Icon: IconType;
};

const iconSize = "text-lg sm:text-xl";

const techIconEntries: TechIconEntry[] = [
	{ label: "JavaScript", aliases: ["js", "ecmascript"], className: `${iconSize} text-yellow-300`, group: "frontend", Icon: SiJavascript },
	{ label: "TypeScript", aliases: ["ts"], className: `${iconSize} text-blue-500`, group: "frontend", Icon: SiTypescript },
	{ label: "React", aliases: ["reactjs"], className: `${iconSize} text-cyan-400`, group: "frontend", Icon: SiReact },
	{ label: "Next.js", aliases: ["next", "nextjs"], className: `${iconSize}`, group: "frontend", Icon: SiNextdotjs },
	{ label: "Vue.js", aliases: ["vue", "vuejs"], className: `${iconSize} text-emerald-500`, group: "frontend", Icon: SiVuedotjs },
	{ label: "Nuxt", aliases: ["nuxtjs"], className: `${iconSize} text-emerald-500`, group: "frontend", Icon: SiNuxt },
	{ label: "Angular", aliases: ["angularjs"], className: `${iconSize} text-red-500`, group: "frontend", Icon: SiAngular },
	{ label: "Svelte", aliases: ["sveltekit"], className: `${iconSize} text-orange-500`, group: "frontend", Icon: SiSvelte },
	{ label: "Remix", aliases: ["remixrun"], className: `${iconSize}`, group: "frontend", Icon: SiRemix },
	{ label: "Redux", aliases: [], className: `${iconSize} text-violet-500`, group: "frontend", Icon: SiRedux },
	{ label: "Tailwind CSS", aliases: ["tailwind", "tailwindcss"], className: `${iconSize} text-sky-400`, group: "frontend", Icon: SiTailwindcss },
	{ label: "Bootstrap", aliases: [], className: `${iconSize} text-violet-600`, group: "frontend", Icon: SiBootstrap },
	{ label: "MUI", aliases: ["material ui", "material-ui"], className: `${iconSize} text-sky-500`, group: "frontend", Icon: SiMui },
	{ label: "HTML5", aliases: ["html"], className: `${iconSize} text-orange-500`, group: "frontend", Icon: SiHtml5 },
	{ label: "CSS3", aliases: ["css"], className: `${iconSize} text-blue-600`, group: "frontend", Icon: SiCss },
	{ label: "Sass", aliases: ["scss"], className: `${iconSize} text-pink-500`, group: "frontend", Icon: SiSass },

	{ label: "Node.js", aliases: ["node", "nodejs"], className: `${iconSize} text-green-600`, group: "backend", Icon: SiNodedotjs },
	{ label: "Express", aliases: ["expressjs"], className: `${iconSize}`, group: "backend", Icon: SiExpress },
	{ label: "NestJS", aliases: ["nestjs"], className: `${iconSize} text-red-500`, group: "backend", Icon: SiNestjs },
	{ label: "PHP", aliases: [], className: `${iconSize} text-indigo-500`, group: "backend", Icon: SiPhp },
	{ label: "Laravel", aliases: [], className: `${iconSize} text-red-500`, group: "backend", Icon: SiLaravel },
	{ label: "Python", aliases: ["py"], className: `${iconSize} text-sky-500`, group: "backend", Icon: SiPython },
	{ label: "Django", aliases: [], className: `${iconSize} text-emerald-700`, group: "backend", Icon: SiDjango },
	{ label: "Flask", aliases: [], className: `${iconSize}`, group: "backend", Icon: SiFlask },
	{ label: "FastAPI", aliases: ["fast api"], className: `${iconSize} text-emerald-500`, group: "backend", Icon: SiFastapi },
	{ label: "Go", aliases: ["golang"], className: `${iconSize} text-cyan-500`, group: "backend", Icon: SiGo },
	{ label: "Rust", aliases: [], className: `${iconSize} text-orange-700`, group: "backend", Icon: SiRust },
	{ label: "Java", aliases: [], className: `${iconSize} text-orange-600`, group: "backend", Icon: SiOpenjdk },
	{ label: "Spring Boot", aliases: ["spring"], className: `${iconSize} text-emerald-600`, group: "backend", Icon: SiSpringboot },
	{ label: "Ruby on Rails", aliases: ["rails", "ror"], className: `${iconSize} text-red-600`, group: "backend", Icon: SiRubyonrails },
	{ label: ".NET", aliases: ["dotnet", "asp.net", "aspnet"], className: `${iconSize} text-violet-500`, group: "backend", Icon: SiDotnet },
	{ label: "GraphQL", aliases: ["gql"], className: `${iconSize} text-pink-500`, group: "backend", Icon: SiGraphql },
	{ label: "Apollo GraphQL", aliases: ["apollo"], className: `${iconSize} text-indigo-500`, group: "backend", Icon: SiApollographql },

	{ label: "MySQL", aliases: [], className: `${iconSize} text-sky-600`, group: "database", Icon: SiMysql },
	{ label: "PostgreSQL", aliases: ["postgres", "postgresql"], className: `${iconSize} text-blue-600`, group: "database", Icon: SiPostgresql },
	{ label: "MongoDB", aliases: ["mongo"], className: `${iconSize} text-green-600`, group: "database", Icon: SiMongodb },
	{ label: "Redis", aliases: [], className: `${iconSize} text-red-500`, group: "database", Icon: SiRedis },
	{ label: "SQLite", aliases: [], className: `${iconSize} text-blue-500`, group: "database", Icon: SiSqlite },
	{ label: "Prisma", aliases: [], className: `${iconSize}`, group: "database", Icon: SiPrisma },
	{ label: "Supabase", aliases: [], className: `${iconSize} text-emerald-500`, group: "database", Icon: SiSupabase },
	{ label: "Firebase", aliases: [], className: `${iconSize} text-amber-500`, group: "database", Icon: SiFirebase },

	{ label: "Docker", aliases: [], className: `${iconSize} text-sky-500`, group: "devops", Icon: SiDocker },
	{ label: "Kubernetes", aliases: ["k8s"], className: `${iconSize} text-blue-600`, group: "devops", Icon: SiKubernetes },
	{ label: "Nginx", aliases: [], className: `${iconSize} text-emerald-600`, group: "devops", Icon: SiNginx },
	{ label: "GitHub Actions", aliases: ["github action", "gha"], className: `${iconSize}`, group: "devops", Icon: SiGithubactions },
	{ label: "Vercel", aliases: [], className: `${iconSize}`, group: "cloud", Icon: SiVercel },
	{ label: "Netlify", aliases: [], className: `${iconSize} text-cyan-500`, group: "cloud", Icon: SiNetlify },
	{ label: "Cloudflare", aliases: [], className: `${iconSize} text-orange-500`, group: "cloud", Icon: SiCloudflare },
	{ label: "AWS", aliases: ["amazon web services"], className: `${iconSize} text-amber-500`, group: "cloud", Icon: FaAws },
	{ label: "Google Cloud", aliases: ["gcp"], className: `${iconSize} text-blue-500`, group: "cloud", Icon: SiGooglecloud },
	{ label: "Azure", aliases: ["microsoft azure"], className: `${iconSize} text-blue-500`, group: "cloud", Icon: FaMicrosoft },

	{ label: "OpenAI", aliases: ["openai api"], className: `${iconSize}`, group: "ai", Icon: SiOpenai },
	{ label: "Claude", aliases: ["claude code", "anthropic"], className: `${iconSize} text-orange-500`, group: "ai", Icon: BsClaude },
	{ label: "LangChain", aliases: [], className: `${iconSize} text-emerald-500`, group: "ai", Icon: SiLangchain },
	{ label: "Hugging Face", aliases: ["huggingface"], className: `${iconSize} text-amber-500`, group: "ai", Icon: SiHuggingface },

	{ label: "React Native", aliases: ["react-native"], className: `${iconSize} text-cyan-400`, group: "mobile", Icon: SiReact },
	{ label: "Flutter", aliases: [], className: `${iconSize} text-sky-500`, group: "mobile", Icon: SiFlutter },
	{ label: "Swift", aliases: ["swiftui"], className: `${iconSize} text-orange-500`, group: "mobile", Icon: SiSwift },
	{ label: "Kotlin", aliases: [], className: `${iconSize} text-violet-500`, group: "mobile", Icon: SiKotlin },

	{ label: "Jest", aliases: [], className: `${iconSize} text-red-600`, group: "testing", Icon: SiJest },
	{ label: "Vitest", aliases: [], className: `${iconSize} text-emerald-500`, group: "testing", Icon: SiVitest },
	{ label: "Cypress", aliases: [], className: `${iconSize} text-emerald-500`, group: "testing", Icon: SiCypress },
	{ label: "Playwright", aliases: [], className: `${iconSize}`, group: "testing", Icon: SiSelenium },
	{ label: "Selenium", aliases: [], className: `${iconSize} text-emerald-500`, group: "testing", Icon: SiSelenium },
	{ label: "Postman", aliases: [], className: `${iconSize} text-orange-500`, group: "testing", Icon: SiPostman },

	{ label: "Git", aliases: [], className: `${iconSize} text-orange-500`, group: "tooling", Icon: SiGit },
	{ label: "GitHub", aliases: [], className: `${iconSize}`, group: "tooling", Icon: SiGithub },
	{ label: "GitLab", aliases: [], className: `${iconSize} text-orange-600`, group: "tooling", Icon: SiGitlab },
	{ label: "npm", aliases: [], className: `${iconSize} text-red-500`, group: "tooling", Icon: SiNpm },
	{ label: "pnpm", aliases: [], className: `${iconSize} text-amber-500`, group: "tooling", Icon: SiPnpm },
	{ label: "Yarn", aliases: [], className: `${iconSize} text-sky-500`, group: "tooling", Icon: SiYarn },
	{ label: "Vite", aliases: [], className: `${iconSize} text-violet-500`, group: "tooling", Icon: SiVite },
	{ label: "Webpack", aliases: [], className: `${iconSize} text-blue-500`, group: "tooling", Icon: SiWebpack },
	{ label: "ESLint", aliases: [], className: `${iconSize} text-violet-600`, group: "tooling", Icon: SiEslint },
	{ label: "Prettier", aliases: [], className: `${iconSize} text-pink-500`, group: "tooling", Icon: SiPrettier },
	{ label: "VS Code", aliases: ["vscode", "visual studio code"], className: `${iconSize} text-blue-500`, group: "tooling", Icon: VscVscode },
];

export const normalizeTechName = (value: string) =>
	value
		.toLowerCase()
		.replace(/[.+#/\\_-]/g, " ")
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();

const toCompactKey = (value: string) => normalizeTechName(value).replace(/\s+/g, "");

type ResolvedTechIcon = {
	label: string;
	className: string;
	Icon: IconType;
	group: TechGroup;
};

export type TechCategoryPresetKey = Exclude<TechGroup, "others">;

export type TechCategoryPreset = {
	key: TechCategoryPresetKey;
	label: string;
	items: string[];
};

const techLookup = new Map<string, ResolvedTechIcon>();
const allLabels: string[] = [];

for (const entry of techIconEntries) {
	const resolved: ResolvedTechIcon = {
		label: entry.label,
		className: entry.className,
		Icon: entry.Icon,
		group: entry.group,
	};

	allLabels.push(entry.label);

	const addKey = (key: string) => {
		const normalized = normalizeTechName(key);
		if (!normalized) return;
		techLookup.set(normalized, resolved);
		techLookup.set(toCompactKey(key), resolved);
	};

	addKey(entry.label);
	for (const alias of entry.aliases) {
		addKey(alias);
	}
}

export const getTechIcon = (value: string) => {
	const normalized = normalizeTechName(value);
	return techLookup.get(normalized) ?? techLookup.get(toCompactKey(value));
};

const labelsByGroup = techIconEntries.reduce<Record<TechGroup, string[]>>(
	(acc, entry) => {
		acc[entry.group].push(entry.label);
		return acc;
	},
	{
		frontend: [],
		backend: [],
		database: [],
		devops: [],
		cloud: [],
		ai: [],
		mobile: [],
		testing: [],
		tooling: [],
		others: [],
	},
);

const TECH_CATEGORY_PRESETS: TechCategoryPreset[] = [
	{
		key: "frontend",
		label: "Frontend",
		items: labelsByGroup.frontend,
	},
	{
		key: "backend",
		label: "Backend",
		items: labelsByGroup.backend,
	},
	{
		key: "database",
		label: "Database",
		items: labelsByGroup.database,
	},
	{
		key: "devops",
		label: "DevOps",
		items: labelsByGroup.devops,
	},
	{
		key: "cloud",
		label: "Cloud",
		items: labelsByGroup.cloud,
	},
	{
		key: "ai",
		label: "AI / ML",
		items: labelsByGroup.ai,
	},
	{
		key: "mobile",
		label: "Mobile",
		items: labelsByGroup.mobile,
	},
	{
		key: "testing",
		label: "Testing",
		items: labelsByGroup.testing,
	},
	{
		key: "tooling",
		label: "Tooling",
		items: labelsByGroup.tooling,
	},
];

const presetByKey = new Map<TechCategoryPresetKey, TechCategoryPreset>(
	TECH_CATEGORY_PRESETS.map((preset) => [preset.key, preset]),
);

const presetNameLookup = new Map<string, TechCategoryPresetKey>();
for (const preset of TECH_CATEGORY_PRESETS) {
	presetNameLookup.set(normalizeTechName(preset.key), preset.key);
	presetNameLookup.set(normalizeTechName(preset.label), preset.key);
}

export const getTechCategoryPresets = () => TECH_CATEGORY_PRESETS;

export const getTechCategoryPresetByKey = (
	key: TechCategoryPresetKey,
): TechCategoryPreset | undefined => presetByKey.get(key);

export const findTechCategoryPresetKeyByName = (
	categoryName: string,
): TechCategoryPresetKey | null => {
	const normalized = normalizeTechName(categoryName);
	if (!normalized) return null;
	return presetNameLookup.get(normalized) ?? null;
};

export const getSuggestedTechForCategory = (
	categoryName: string,
	limit = 14,
): string[] => {
	const normalized = normalizeTechName(categoryName);

	if (
		normalized.includes("front") ||
		normalized.includes("client") ||
		normalized.includes("ui")
	) {
		return labelsByGroup.frontend.slice(0, limit);
	}

	if (
		normalized.includes("back") ||
		normalized.includes("server") ||
		normalized.includes("api")
	) {
		return labelsByGroup.backend.slice(0, limit);
	}

	if (
		normalized.includes("data") ||
		normalized.includes("database") ||
		normalized.includes("db")
	) {
		return labelsByGroup.database.slice(0, limit);
	}

	if (
		normalized.includes("devops") ||
		normalized.includes("infra") ||
		normalized.includes("deploy") ||
		normalized.includes("ops")
	) {
		return labelsByGroup.devops.slice(0, limit);
	}

	if (
		normalized.includes("cloud") ||
		normalized.includes("hosting")
	) {
		return labelsByGroup.cloud.slice(0, limit);
	}

	if (
		normalized.includes("ai") ||
		normalized.includes("llm") ||
		normalized.includes("ml")
	) {
		return labelsByGroup.ai.slice(0, limit);
	}

	if (
		normalized.includes("mobile") ||
		normalized.includes("ios") ||
		normalized.includes("android")
	) {
		return labelsByGroup.mobile.slice(0, limit);
	}

	if (
		normalized.includes("test") ||
		normalized.includes("qa")
	) {
		return labelsByGroup.testing.slice(0, limit);
	}

	if (
		normalized.includes("tool") ||
		normalized.includes("productivity")
	) {
		return labelsByGroup.tooling.slice(0, limit);
	}

	return allLabels.slice(0, limit);
};

export const searchTechOptions = (query: string, limit = 20): string[] => {
	const normalizedQuery = normalizeTechName(query);

	if (!normalizedQuery) {
		return allLabels.slice(0, limit);
	}

	const compactQuery = normalizedQuery.replace(/\s+/g, "");

	return allLabels
		.filter((label) => {
			const normalized = normalizeTechName(label);
			const compact = normalized.replace(/\s+/g, "");
			return normalized.includes(normalizedQuery) || compact.includes(compactQuery);
		})
		.slice(0, limit);
};
