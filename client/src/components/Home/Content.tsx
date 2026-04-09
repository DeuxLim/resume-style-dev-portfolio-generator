import About from "@/components/Home/About";
import Timeline from "@/components/Home/Timeline";
import Footer from "@/components/Home/Footer";
import Heatmap from "@/components/Home/Heatmap";
import Projects from "@/components/Home/Projects";
import TechStack from "@/components/Home/TechStack";
import Experience from "./Experience";
import { motion } from "motion/react";
import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";
import MarkdownContent from "@/components/shared/MarkdownContent";
import {
	getVisibleSectionOrder,
	PORTFOLIO_LAYOUT_GAP,
} from "@/lib/portfolioLayout";
import {
	type CSSProperties,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import type { PublicPortfolio } from "../../../../shared/types/portfolio.types";
import { defaultPortfolioLayout } from "../../../../shared/defaults/portfolio";
import type { PortfolioSectionKey } from "../../../../shared/types/portfolio.types";

const DESKTOP_MASONRY_ROW_HEIGHT = 8;

export default function Content({
	portfolio,
}: {
	portfolio?: PublicPortfolio;
}) {
	const prefersReducedMotion = usePrefersReducedMotion();
	const data = portfolio;
	const sectionOrder = getVisibleSectionOrder(data);
	const rawSpans = {
		...defaultPortfolioLayout.sectionSpans,
		...(data?.layout?.sectionSpans ?? {}),
	};

	const sectionSpanByKey: Record<PortfolioSectionKey, 4 | 6 | 8 | 12> = {
		about: (rawSpans.about ?? 8) as 4 | 6 | 8 | 12,
		timeline: (rawSpans.timeline ?? 4) as 4 | 6 | 8 | 12,
		experience: (rawSpans.experience ?? 8) as 4 | 6 | 8 | 12,
		tech: (rawSpans.tech ?? 4) as 4 | 6 | 8 | 12,
		projects: (rawSpans.projects ?? 12) as 4 | 6 | 8 | 12,
		heatmap: (rawSpans.heatmap ?? 6) as 4 | 6 | 8 | 12,
		custom: (rawSpans.custom ?? 6) as 4 | 6 | 8 | 12,
	};
	const sectionRefs = useRef<Partial<Record<PortfolioSectionKey, HTMLDivElement | null>>>({});
	const [rowSpanByKey, setRowSpanByKey] = useState<Partial<Record<PortfolioSectionKey, number>>>({});

	useEffect(() => {
		if (typeof window === "undefined") return;

		const computeRowSpans = () => {
			if (window.innerWidth < 768) return;

			setRowSpanByKey((previous) => {
				let changed = false;
				const next = { ...previous };

				sectionOrder.forEach((sectionKey) => {
					const node = sectionRefs.current[sectionKey];
					if (!node) return;
					const measuredContentHeight = Math.max(
						node.scrollHeight,
						node.getBoundingClientRect().height,
					);
					const rowSpan = Math.max(
						1,
						Math.ceil(
							(measuredContentHeight + PORTFOLIO_LAYOUT_GAP) /
								(DESKTOP_MASONRY_ROW_HEIGHT + PORTFOLIO_LAYOUT_GAP),
						),
					);
					if (next[sectionKey] !== rowSpan) {
						next[sectionKey] = rowSpan;
						changed = true;
					}
				});

				return changed ? next : previous;
			});
		};

		const resizeObserver = new ResizeObserver(() => {
			window.requestAnimationFrame(computeRowSpans);
		});

		sectionOrder.forEach((sectionKey) => {
			const node = sectionRefs.current[sectionKey];
			if (node) resizeObserver.observe(node);
		});

		window.addEventListener("resize", computeRowSpans);
		window.requestAnimationFrame(computeRowSpans);

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener("resize", computeRowSpans);
		};
	}, [sectionOrder, data]);

	const sectionContentByKey: Record<PortfolioSectionKey, ReactNode> = {
		about: <About paragraphs={data?.about} />,
		timeline: <Timeline items={data?.timeline} />,
		experience: <Experience items={data?.experiences} />,
		tech: <TechStack categories={data?.techCategories} />,
		projects: <Projects items={data?.projects} />,
		heatmap: data?.githubUsername?.trim() ? (
			<Heatmap username={data?.githubUsername} />
		) : (
			<div className="text-sm text-muted-foreground">
				GitHub username is empty. Add one to show the heatmap.
			</div>
		),
		custom: (
			<div className="space-y-3">
				{data?.customSections?.length ? (
					data.customSections.map((section) => (
						<div key={section.id} className="space-y-2">
							<div className="text-base sm:text-lg font-bold">{section.title}</div>
							{section.type === "bullets" ? (
								<ul className="list-disc pl-5 space-y-1 text-sm text-(--app-muted)">
									{section.items?.filter(Boolean).map((item, index) => (
										<li key={`${section.id}-item-${index}`}>{item}</li>
									))}
								</ul>
							) : section.type === "links" ? (
								<div className="space-y-1.5">
									{section.links
										?.filter((link) => link.label || link.url)
										.map((link) => (
											<a
												key={link.id}
												href={link.url || undefined}
												target={link.url ? "_blank" : undefined}
												rel={link.url ? "noreferrer noopener" : undefined}
												className="block text-sm text-(--app-muted) underline underline-offset-2 break-all"
											>
												{link.label || link.url}
											</a>
										))}
								</div>
							) : (
								<MarkdownContent
									content={section.body}
									className="text-sm text-(--app-muted) whitespace-pre-wrap"
								/>
							)}
						</div>
					))
				) : (
					<div className="text-sm text-muted-foreground">No custom sections yet.</div>
				)}
			</div>
		),
	};

	return (
		<div className="flex flex-col">
			<div
				className="generated-output-grid grid"
				style={
					{
						gap: `${PORTFOLIO_LAYOUT_GAP}px`,
						"--desktop-row-height": `${DESKTOP_MASONRY_ROW_HEIGHT}px`,
					} as CSSProperties
				}
			>
				{sectionOrder.map((sectionKey, index) => {
					const desktopPlacementStyle = {
						"--desktop-col-span": String(sectionSpanByKey[sectionKey] ?? 6),
						"--desktop-row-span": String(rowSpanByKey[sectionKey] ?? 1),
					} as CSSProperties;

					return (
						<motion.div
							key={sectionKey}
							ref={(node) => {
								sectionRefs.current[sectionKey] = node;
							}}
							layout
							initial={
								prefersReducedMotion
									? false
									: { opacity: 0, y: index % 2 === 0 ? 14 : -14 }
							}
							animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
							transition={
								prefersReducedMotion
									? undefined
									: { duration: 0.45, ease: [0.16, 1, 0.3, 1] }
							}
							className="generated-output-section app-card overflow-x-hidden p-2.5 sm:p-4 [overflow-wrap:anywhere]"
							style={desktopPlacementStyle}
						>
							{sectionContentByKey[sectionKey]}
						</motion.div>
					);
				})}
			</div>

			{/* Footer */}
			<motion.div
				initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
				animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
				transition={
					prefersReducedMotion
						? undefined
						: { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
				}
				className="generated-output-footer mt-3 flex h-16 items-center justify-center border-t border-(--app-border) p-2.5 sm:mt-4 sm:h-24 sm:p-4"
			>
				<Footer fullName={data?.fullName} />
			</motion.div>
		</div>
	);
}
