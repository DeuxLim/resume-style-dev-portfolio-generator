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
	IoMail,
} from "react-icons/io5";
import cover from "@/assets/coverphoto.jpg";
import { FaDownload } from "react-icons/fa6";
import { samplePortfolio } from "../../../../shared/defaults/portfolio";
import type { PublicPortfolio } from "../../../../shared/types/portfolio.types";

export default function Header({ portfolio }: { portfolio?: PublicPortfolio }) {
	const prefersReducedMotion = usePrefersReducedMotion();
	const data = portfolio ?? samplePortfolio;
	const avatarSrc = getAvatarUrl(data.avatarUrl);
	const coverSrc = resolveAssetUrl(data.coverUrl) || cover;
	const resumeHref = data.username
		? `${apiBaseUrl}/resumes/${data.username}/pdf?download=1`
		: "/resume.pdf";

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

			<section className="flex gap-3 pt-3 sm:pt-4 md:gap-4 md:pt-0">
				<div className="hidden h-full items-center justify-center md:flex">
					<div className="overflow-hidden rounded-none border border-(--app-border) md:flex md:h-40 md:w-40">
						<img
							src={avatarSrc}
							alt={data.fullName}
							className="h-full w-full object-cover object-top"
						/>
					</div>
				</div>

				<div className="flex w-full min-w-0 flex-col justify-center gap-3 px-1 pb-1 sm:gap-4 sm:px-1.5 sm:pb-2">
					<div className="flex flex-col gap-2">
						<div className="flex min-w-0 flex-col gap-1.5">
							<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
								<div className="min-w-0">
									<div className="break-words font-semibold leading-tight tracking-tight text-xl sm:text-3xl md:text-4xl">
										{data.fullName}
									</div>
									<div className="break-words text-xs leading-snug text-(--app-muted) sm:text-sm">
										{data.headline}
									</div>
								</div>

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
							{data.githubUrl && (
								<a
									title="GitHub"
									aria-label="GitHub"
									className="app-chip flex cursor-pointer items-center justify-center gap-1 px-2.5 py-1.5 focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:outline-none"
									href={ensureHref(data.githubUrl)}
									target="_blank"
									rel="noreferrer noopener"
								>
									<IoLogoGithub className="text-lg md:text-xl" />
									<div className="hidden font-light md:block md:text-xs">
										Github
									</div>
								</a>
							)}
							{data.linkedinUrl && (
								<a
									title="LinkedIn"
									aria-label="LinkedIn"
									className="app-chip flex cursor-pointer items-center justify-center gap-1 px-2.5 py-1.5 focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:outline-none"
									href={ensureHref(data.linkedinUrl)}
									target="_blank"
									rel="noreferrer noopener"
								>
									<IoLogoLinkedin className="text-lg md:text-xl" />
									<div className="hidden font-light md:block md:text-xs">
										LinkedIn
									</div>
								</a>
							)}
							{data.phone && (
								<a
									title="Phone"
									aria-label="Phone"
									className="app-chip flex cursor-pointer items-center justify-center gap-1 px-2.5 py-1.5 focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:outline-none"
									href={`tel:${data.phone}`}
								>
									<IoCall className="text-lg md:text-xl" />
									<div className="hidden font-light text-nowrap md:block md:text-xs">
										{data.phone}
									</div>
								</a>
							)}
							{data.email && (
								<a
									title="Email"
									aria-label="Email"
									className="app-chip flex cursor-pointer items-center justify-center gap-1 px-2.5 py-1.5 focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:outline-none"
									href={`mailto:${data.email}`}
								>
									<IoMail className="text-lg md:text-xl" />
									<div className="hidden font-light md:block md:text-xs">
										{data.email}
									</div>
								</a>
							)}
						</div>
						<ThemeToggleButton />
					</div>
				</div>
			</section>
		</motion.div>
	);
}
