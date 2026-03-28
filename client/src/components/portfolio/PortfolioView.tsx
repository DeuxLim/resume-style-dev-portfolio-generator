import me from "@/assets/me.jpeg";
import cover from "@/assets/coverphoto.jpg";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";
import { ensureHref } from "@/lib/portfolio";
import useTheme from "@/context/Theme/useTheme";
import { GitHubCalendar } from "react-github-calendar";
import type { PublicPortfolio } from "../../../../shared/types/portfolio.types";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import {
	IoBriefcase,
	IoCall,
	IoLocationOutline,
	IoLogoGithub,
	IoLogoLinkedin,
	IoMail,
} from "react-icons/io5";

function HeaderCard({ portfolio }: { portfolio: PublicPortfolio }) {
	const prefersReducedMotion = usePrefersReducedMotion();
	const avatarSrc = portfolio.avatarUrl || me;
	const coverSrc = portfolio.coverUrl || cover;

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
				className="relative w-full md:hidden flex items-center justify-center h-36 sm:h-48 rounded-none bg-cover bg-center border border-(--app-border) overflow-hidden"
				style={{ backgroundImage: `url(${coverSrc})` }}
			>
				<div className="absolute inset-0 bg-(--app-cover-overlay)" />
				<div className="relative md:hidden size-24 sm:size-28 overflow-hidden shrink-0 rounded-full shadow-sm border border-(--app-border)">
					<img
						src={avatarSrc}
						alt={portfolio.fullName}
						className="w-full h-full object-cover object-top"
					/>
				</div>
			</div>

			<section className="flex gap-3 md:gap-4 md:h-40 pt-3 sm:pt-4 md:pt-0">
				<div className="hidden h-full md:flex items-center justify-center">
					<div className="md:flex md:h-40 md:w-40 overflow-hidden rounded-none border border-(--app-border)">
						<img
							src={avatarSrc}
							alt={portfolio.fullName}
							className="w-full h-full object-cover object-top"
						/>
					</div>
				</div>

				<div className="flex w-full justify-center flex-col p-1 gap-3 sm:gap-4">
					<div className="flex flex-col h-full gap-2">
						<div className="flex flex-col gap-1 min-w-0">
							<div className="flex items-center justify-between gap-4">
								<div className="font-semibold text-xl sm:text-3xl md:text-4xl tracking-tight">
									{portfolio.fullName}
								</div>
								<ThemeToggleButton />
							</div>
							<div className="text-xs md:text-sm text-(--app-muted)">
								{portfolio.headline}
							</div>
						</div>
						<div className="flex items-center justify-start text-xs gap-1 text-(--app-muted)">
							<IoLocationOutline />
							{portfolio.location}
						</div>
						<div className="flex items-center justify-start text-xs gap-1 text-(--app-muted)">
							<IoBriefcase />
							{portfolio.experienceSummary} | {portfolio.education}
						</div>
						<div className="text-xs text-(--app-muted)">
							{portfolio.availability}
						</div>
					</div>

					<div className="flex gap-1.5 flex-wrap">
						{portfolio.githubUrl && (
							<a
								href={ensureHref(portfolio.githubUrl)}
								target="_blank"
								rel="noreferrer noopener"
								className="app-chip flex items-center justify-center gap-1 px-2.5 py-1.5"
							>
								<IoLogoGithub className="text-lg md:text-xl" />
								<div className="md:text-xs md:block font-light hidden">
									GitHub
								</div>
							</a>
						)}
						{portfolio.linkedinUrl && (
							<a
								href={ensureHref(portfolio.linkedinUrl)}
								target="_blank"
								rel="noreferrer noopener"
								className="app-chip flex items-center justify-center gap-1 px-2.5 py-1.5"
							>
								<IoLogoLinkedin className="text-lg md:text-xl" />
								<div className="md:text-xs md:block font-light hidden">
									LinkedIn
								</div>
							</a>
						)}
						{portfolio.phone && (
							<a
								href={`tel:${portfolio.phone}`}
								className="app-chip flex items-center justify-center gap-1 px-2.5 py-1.5"
							>
								<IoCall className="text-lg md:text-xl" />
								<div className="md:text-xs md:block font-light hidden text-nowrap">
									{portfolio.phone}
								</div>
							</a>
						)}
						{portfolio.email && (
							<a
								href={`mailto:${portfolio.email}`}
								className="app-chip flex items-center justify-center gap-1 px-2.5 py-1.5"
							>
								<IoMail className="text-lg md:text-xl" />
								<div className="md:text-xs md:block font-light hidden">
									{portfolio.email}
								</div>
							</a>
						)}
					</div>
				</div>
			</section>
		</motion.div>
	);
}

function AboutCard({ portfolio }: { portfolio: PublicPortfolio }) {
	return (
		<div className="space-y-4">
			<div className="text-base sm:text-lg font-bold">About</div>
			<div className="text-[13px] sm:text-sm font-light space-y-3">
				{portfolio.about.map((paragraph) => (
					<p key={paragraph}>{paragraph}</p>
				))}
			</div>
		</div>
	);
}

function TimelineCard({ portfolio }: { portfolio: PublicPortfolio }) {
	return (
		<div className="space-y-4">
			<div className="text-base sm:text-lg font-bold">Timeline</div>
			<div className="font-sans">
				<div className="flex flex-col gap-2">
					{portfolio.timeline.map((item, index) => (
						<div key={item.id} className="flex flex-row items-start gap-2.5">
							<div className="flex flex-col items-center w-3.5 shrink-0 self-stretch">
								<div
									className={`w-2 h-2 shrink-0 mt-0.5 ${
										index === 0
											? "bg-(--app-text)"
											: "bg-(--app-border)"
									}`}
								/>
								{index < portfolio.timeline.length - 1 && (
									<div className="w-px flex-1 bg-(--app-border) mt-1" />
								)}
							</div>

							<div className="pb-7 flex-1 min-w-0">
								<div className="flex items-start justify-between gap-2">
									<span className="text-sm font-semibold leading-none flex-1 min-w-0">
										{item.position}
									</span>
									<span className="text-xs text-(--app-muted) tracking-wide leading-none shrink-0">
										{item.year}
									</span>
								</div>
								{(item.company || item.note) && (
									<div className="text-xs text-(--app-muted) mt-1">
										{item.note && <span>{item.note} · </span>}
										<span>{item.company}</span>
									</div>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function ExperienceCard({ portfolio }: { portfolio: PublicPortfolio }) {
	const lines: { content: ReactNode }[] = [];

	portfolio.experiences.forEach((experience, index) => {
		lines.push({
			content: (
				<span className="text-(--app-subtle) text-[11px] sm:text-xs">
					{`// ${String(index + 1).padStart(2, "0")} — ${experience.company} · ${experience.period}`}
				</span>
			),
		});
		lines.push({
			content: (
				<span className="text-xs sm:text-[13px]">
					<span className="text-(--app-subtle)">function </span>
					<span className="font-semibold text-(--app-text)">
						{experience.role.replace(/\s+/g, "")}
					</span>
					<span className="text-(--app-subtle)">() {"{"}</span>
				</span>
			),
		});

		experience.highlights.forEach((highlight) => {
			lines.push({
				content: (
					<span className="flex gap-2 pl-4 text-[11.5px] sm:text-[12.5px] leading-snug">
						<span className="text-(--app-subtle) shrink-0">›</span>
						<span className="text-(--app-muted)">{highlight}</span>
					</span>
				),
			});
		});

		lines.push({
			content: (
				<span className="text-(--app-subtle) text-xs sm:text-[13px]">
					{"}"}
				</span>
			),
		});
	});

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2 border-b border-(--app-border) pb-2">
				<span className="text-base sm:text-lg font-bold">Experience</span>
			</div>
			<div className="flex flex-col font-mono">
				{lines.map((line, index) => (
					<div
						key={index}
						className="grid grid-cols-[24px_1fr] sm:grid-cols-[28px_1fr] gap-x-2.5 sm:gap-x-3 min-h-5 group"
					>
						<span className="text-[10px] text-right text-(--app-subtle) opacity-40 group-hover:opacity-70 select-none pt-px">
							{index + 1}
						</span>
						<span className="leading-relaxed">{line.content}</span>
					</div>
				))}
			</div>
		</div>
	);
}

function TechStackCard({ portfolio }: { portfolio: PublicPortfolio }) {
	return (
		<div className="space-y-3 sm:space-y-4">
			<div className="text-base sm:text-lg font-bold">Tech Stack</div>
			{portfolio.techCategories.map((category, index) => (
				<div key={category.id}>
					<div className="space-y-1">
						<div className="font-medium">{category.name}</div>
						<div className="flex gap-2 flex-wrap">
							{category.items.map((item) => (
								<div
									key={`${category.id}-${item}`}
									className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2"
								>
									<div className="text-sm">{item}</div>
								</div>
							))}
						</div>
					</div>
					{index < portfolio.techCategories.length - 1 && (
						<div className="h-px bg-(--app-border) my-3" />
					)}
				</div>
			))}
		</div>
	);
}

function ProjectsCard({ portfolio }: { portfolio: PublicPortfolio }) {
	return (
		<div className="flex flex-col gap-4">
			<div className="text-base sm:text-lg font-bold">Projects</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
				{portfolio.projects.map((project) => {
					const href = ensureHref(project.url);

					return (
						<a
							key={project.id}
							href={href || undefined}
							target={href ? "_blank" : undefined}
							rel={href ? "noreferrer noopener" : undefined}
							aria-disabled={!href}
							className={`app-chip p-2.5 sm:p-4 flex flex-col gap-1.5 ${
								href
									? "cursor-pointer"
									: "cursor-not-allowed opacity-60 pointer-events-none"
							}`}
						>
							<div className="text-sm font-semibold">{project.name}</div>
							<div className="text-xs text-(--app-muted)">
								{project.description}
							</div>
							{href && (
								<div className="mt-2">
									<span className="text-[11px] px-2 py-1 rounded-none bg-(--app-surface-2) border border-(--app-border)">
										{project.url}
									</span>
								</div>
							)}
						</a>
					);
				})}
			</div>
		</div>
	);
}

function HeatmapCard({ portfolio }: { portfolio: PublicPortfolio }) {
	const { isDarkMode } = useTheme();

	if (!portfolio.githubUsername) {
		return null;
	}

	return (
		<div className="space-y-4 w-full">
			<div className="text-base sm:text-lg font-bold">Daily Coding Heat Map</div>
			<div className="w-full overflow-x-auto">
				<GitHubCalendar
					username={portfolio.githubUsername}
					blockSize={12}
					blockMargin={3}
					fontSize={13}
					style={{ margin: "0 auto" }}
					transformData={(contributions) => {
						const now = new Date();
						const sixMonthsAgo = new Date();
						sixMonthsAgo.setMonth(now.getMonth() - 6);

						return contributions.filter((day) => {
							const date = new Date(day.date);
							return date >= sixMonthsAgo;
						});
					}}
					theme={{
						light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
						...(isDarkMode && {
							dark: [
								"#161b22",
								"#0e4429",
								"#006d32",
								"#26a641",
								"#39d353",
							],
						}),
					}}
					colorScheme={isDarkMode ? "dark" : "light"}
				/>
			</div>
		</div>
	);
}

export default function PortfolioView({
	portfolio,
}: {
	portfolio: PublicPortfolio;
}) {
	const prefersReducedMotion = usePrefersReducedMotion();

	return (
		<main className="flex flex-col gap-3 sm:gap-4">
			<HeaderCard portfolio={portfolio} />
			<div className="grid grid-cols-4 md:grid-cols-12 gap-3 sm:gap-4">
				<motion.div
					initial={prefersReducedMotion ? false : { opacity: 0, x: -18 }}
					animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
					transition={
						prefersReducedMotion
							? undefined
							: { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
					}
					className="col-span-4 md:col-span-8 app-card p-2.5 sm:p-4"
				>
					<AboutCard portfolio={portfolio} />
				</motion.div>

				<motion.div
					initial={prefersReducedMotion ? false : { opacity: 0, x: 18 }}
					animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
					transition={
						prefersReducedMotion
							? undefined
							: { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
					}
					className="col-span-4 md:col-span-4 app-card p-2.5 sm:p-4"
				>
					<TimelineCard portfolio={portfolio} />
				</motion.div>

				<motion.div
					initial={prefersReducedMotion ? false : { opacity: 0, x: -18 }}
					animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
					transition={
						prefersReducedMotion
							? undefined
							: { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
					}
					className="col-span-4 md:col-span-8 app-card p-2.5 sm:p-4"
				>
					<ExperienceCard portfolio={portfolio} />
				</motion.div>

				<motion.div
					initial={prefersReducedMotion ? false : { opacity: 0, x: 18 }}
					animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
					transition={
						prefersReducedMotion
							? undefined
							: { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
					}
					className="col-span-4 md:col-span-4 row-span-2 app-card p-2.5 sm:p-4"
				>
					<TechStackCard portfolio={portfolio} />
				</motion.div>

				<motion.div
					initial={prefersReducedMotion ? false : { opacity: 0, x: -18 }}
					animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
					transition={
						prefersReducedMotion
							? undefined
							: { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
					}
					className="col-span-4 md:col-span-8 app-card p-2.5 sm:p-4"
				>
					<ProjectsCard portfolio={portfolio} />
				</motion.div>

				{portfolio.githubUsername && (
					<motion.div
						initial={prefersReducedMotion ? false : { opacity: 0, x: -18 }}
						animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
						transition={
							prefersReducedMotion
								? undefined
								: { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
						}
						className="col-span-4 md:col-span-6 app-card p-2.5 sm:p-4"
					>
						<HeatmapCard portfolio={portfolio} />
					</motion.div>
				)}

				{portfolio.customSections.map((section) => (
					<motion.div
						key={section.id}
						initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
						animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
						transition={
							prefersReducedMotion
								? undefined
								: { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
						}
						className="col-span-4 md:col-span-6 app-card p-2.5 sm:p-4"
					>
						<div className="space-y-3">
							<div className="text-base sm:text-lg font-bold">
								{section.title}
							</div>
							<p className="text-sm text-(--app-muted) whitespace-pre-wrap">
								{section.body}
							</p>
						</div>
					</motion.div>
				))}

				<motion.div
					initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
					animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
					transition={
						prefersReducedMotion
							? undefined
							: { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
					}
					className="md:col-span-12 col-span-4 border-t border-(--app-border) p-2.5 sm:p-4 flex items-center justify-center mt-3 sm:mt-4 h-16 sm:h-24"
				>
					<div className="text-sm font-light">
						© {new Date().getFullYear()} {portfolio.fullName}. All rights reserved.
					</div>
				</motion.div>
			</div>
		</main>
	);
}
