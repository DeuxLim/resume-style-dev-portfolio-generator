import ThemeToggleButton from "@/components/ThemeToggleButton";
import { motion } from "motion/react";
import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";
import { ensureHref } from "@/lib/portfolio";
import { apiBaseUrl } from "@/lib/axios.client";
import { getAvatarUrl, resolveAssetUrl } from "@/lib/assets";
import {
	IoBriefcase,
	IoCall,
	IoLocationOutline,
	IoLogoGithub,
	IoLogoLinkedin,
	IoLink,
	IoMail,
} from "react-icons/io5";
import cover from "@/assets/coverphoto.jpg";
import { FaDownload } from "react-icons/fa6";
import { samplePortfolio } from "../../../../shared/defaults/portfolio";
import type {
	HeaderAction,
	PublicPortfolio,
} from "../../../../shared/types/portfolio.types";

const MAX_HEADER_ACTIONS = 4;

const resolveHeaderActions = (portfolio: PublicPortfolio): HeaderAction[] => {
	return Array.isArray(portfolio.headerActions)
		? portfolio.headerActions.slice(0, MAX_HEADER_ACTIONS)
		: [];
};

const getHeaderActionValue = (action: HeaderAction) => {
	return String(action.value ?? "").trim();
};

const getHeaderActionHref = (action: HeaderAction, value: string) => {
	if (action.type === "email") {
		return `mailto:${value}`;
	}
	if (action.type === "phone") {
		return `tel:${value}`;
	}
	return ensureHref(value);
};

const getHeaderActionIcon = (type: HeaderAction["type"]) => {
	if (type === "github") return <IoLogoGithub className="text-lg md:text-xl" />;
	if (type === "linkedin") return <IoLogoLinkedin className="text-lg md:text-xl" />;
	if (type === "email") return <IoMail className="text-lg md:text-xl" />;
	if (type === "phone") return <IoCall className="text-lg md:text-xl" />;
	return <IoLink className="text-lg md:text-xl" />;
};

const getHeaderActionFallbackLabel = (type: HeaderAction["type"]) => {
	if (type === "github") return "Github";
	if (type === "linkedin") return "LinkedIn";
	if (type === "email") return "Email";
	if (type === "phone") return "Phone";
	return "Link";
};

export default function Header({ portfolio }: { portfolio?: PublicPortfolio }) {
	const prefersReducedMotion = usePrefersReducedMotion();
	const data = portfolio ?? samplePortfolio;
	const avatarSrc = getAvatarUrl(data.avatarUrl);
	const coverSrc = resolveAssetUrl(data.coverUrl) || cover;
	const resumeHref = data.username
		? `${apiBaseUrl}/resumes/${data.username}/pdf?download=1`
		: "/resume.pdf";
	const headerActions = resolveHeaderActions(data)
		.map((action) => {
			const value = getHeaderActionValue(action);
			const displayText =
				action.display === "value"
					? value
					: String(action.label ?? "").trim() || getHeaderActionFallbackLabel(action.type);
			return {
				action,
				value,
				displayText,
			};
		})
		.filter((entry) => entry.value);

	return (
		<motion.div
			initial={prefersReducedMotion ? false : { opacity: 0, y: -24 }}
			animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
			transition={
				prefersReducedMotion
					? undefined
					: { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
			}
			className="app-card p-2.5 sm:p-4"
		>
			<div
				className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-none border border-(--app-border) bg-cover bg-center sm:h-48 md:hidden"
				style={{ backgroundImage: `url(${coverSrc})` }}
			>
				<div className="absolute inset-0 bg-(--app-cover-overlay)" />
				<div className="relative size-24 shrink-0 overflow-hidden rounded-full border border-(--app-border) shadow-sm sm:size-28 md:hidden">
					<img
						src={avatarSrc}
						alt={data.fullName}
						className="h-full w-full object-cover object-top"
					/>
				</div>
			</div>

			<section className="flex gap-3 pt-3 sm:pt-4 md:h-40 md:gap-4 md:pt-0">
				<div className="hidden h-full items-center justify-center md:flex">
					<div className="overflow-hidden rounded-none border border-(--app-border) md:flex md:h-40 md:w-40">
						<img
							src={avatarSrc}
							alt={data.fullName}
							className="h-full w-full object-cover object-top"
						/>
					</div>
				</div>

				<div className="flex w-full min-w-0 flex-col justify-center gap-3 p-1 sm:gap-4">
					<div className="flex h-full flex-col gap-2">
						<div className="flex min-w-0 flex-col gap-1">
							<div className="flex items-center justify-between gap-2">
								<div className="min-w-0">
									<div className="break-words font-semibold leading-tight tracking-tight text-xl sm:text-3xl md:text-4xl">
										{data.fullName}
									</div>
									<div className="break-words text-xs leading-snug text-(--app-muted) sm:text-sm">
										{data.headline}
									</div>
								</div>

								<div className="flex shrink-0 gap-2">
									<a
										className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-none px-2 transition-colors focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:outline-none active:scale-[0.98] sm:h-9 sm:w-24"
										href={resumeHref}
										download
									>
										<FaDownload className="text-sm text-(--app-accent) sm:text-base" />
										<div className="text-xs">Resume</div>
									</a>
								</div>
							</div>
						</div>

						<div className="flex flex-wrap items-center justify-start gap-x-1 gap-y-1 text-xs text-(--app-muted) sm:text-sm">
							<IoLocationOutline className="shrink-0" />
							<span className="break-words">{data.location}</span>
						</div>
						<div className="flex flex-wrap items-center justify-start gap-x-1 gap-y-1 text-xs text-(--app-muted) sm:text-sm">
							<IoBriefcase className="shrink-0" />
							<span className="break-words">
								{data.experienceSummary} | {data.education}
							</span>
						</div>
					</div>

					<div className="flex justify-between">
						<div className="flex flex-wrap gap-1.5">
							{headerActions.map(({ action, value, displayText }) => (
								// action labels can come from either a fixed label or the raw value.
								<a
									key={action.id}
									title={displayText || "Header action"}
									aria-label={displayText || "Header action"}
									className="app-chip flex cursor-pointer items-center justify-center gap-1 px-2.5 py-1.5 focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:outline-none"
									href={getHeaderActionHref(action, value)}
									{...(action.type === "link" ||
									action.type === "github" ||
									action.type === "linkedin"
										? {
												target: "_blank",
												rel: "noreferrer noopener",
											}
										: {})}
								>
									{getHeaderActionIcon(action.type)}
									<div className="hidden font-light md:block md:text-xs">
										{displayText || "Action"}
									</div>
								</a>
							))}
						</div>
						<ThemeToggleButton />
					</div>
				</div>
			</section>
		</motion.div>
	);
}
