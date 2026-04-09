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
	packSectionLayout,
	getVisibleSectionOrder,
	PORTFOLIO_LAYOUT_GAP,
	PORTFOLIO_LAYOUT_ROW_HEIGHT,
} from "@/lib/portfolioLayout";
import type { CSSProperties, ReactNode } from "react";
import type { PublicPortfolio } from "../../../../shared/types/portfolio.types";
import { defaultPortfolioLayout } from "../../../../shared/defaults/portfolio";
import type { PortfolioSectionKey } from "../../../../shared/types/portfolio.types";

export default function Content({
	portfolio,
}: {
	portfolio?: PublicPortfolio;
}) {
	const clampSectionHeight = (value: number) =>
		Math.min(48, Math.max(4, Math.round(value)));
	const prefersReducedMotion = usePrefersReducedMotion();
	const data = portfolio;
	const sectionOrder = getVisibleSectionOrder(data);
	const rawSpans = {
		...defaultPortfolioLayout.sectionSpans,
		...(data?.layout?.sectionSpans ?? {}),
	};
	const rawHeights = {
		...defaultPortfolioLayout.sectionHeights,
		...(data?.layout?.sectionHeights ?? {}),
	};
	const rawPositions = {
		...(defaultPortfolioLayout.sectionPositions ?? {}),
		...(data?.layout?.sectionPositions ?? {}),
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
	const sectionHeightByKey: Record<PortfolioSectionKey, number> = {
		about: clampSectionHeight(Number(rawHeights.about ?? 7)),
		timeline: clampSectionHeight(Number(rawHeights.timeline ?? 7)),
		experience: clampSectionHeight(Number(rawHeights.experience ?? 7)),
		tech: clampSectionHeight(Number(rawHeights.tech ?? 7)),
		projects: clampSectionHeight(Number(rawHeights.projects ?? 6)),
		heatmap: clampSectionHeight(Number(rawHeights.heatmap ?? 5)),
		custom: clampSectionHeight(Number(rawHeights.custom ?? 5)),
	};
	const sectionPositionByKey: Record<PortfolioSectionKey, { x: number; y: number }> = {
		about: { x: Number(rawPositions.about?.x ?? 0), y: Number(rawPositions.about?.y ?? 0) },
		timeline: { x: Number(rawPositions.timeline?.x ?? 8), y: Number(rawPositions.timeline?.y ?? 0) },
		experience: { x: Number(rawPositions.experience?.x ?? 0), y: Number(rawPositions.experience?.y ?? 7) },
		tech: { x: Number(rawPositions.tech?.x ?? 8), y: Number(rawPositions.tech?.y ?? 7) },
		projects: { x: Number(rawPositions.projects?.x ?? 0), y: Number(rawPositions.projects?.y ?? 14) },
		heatmap: { x: Number(rawPositions.heatmap?.x ?? 0), y: Number(rawPositions.heatmap?.y ?? 20) },
		custom: { x: Number(rawPositions.custom?.x ?? 6), y: Number(rawPositions.custom?.y ?? 20) },
	};
	const packedLayoutByKey = packSectionLayout({
		order: sectionOrder,
		spans: sectionSpanByKey,
		heights: sectionHeightByKey,
		positions: sectionPositionByKey,
	});
	const footerDesktopRowStart =
		sectionOrder.reduce((maxRow, key) => {
			const y = packedLayoutByKey[key]?.y ?? 0;
			const h = packedLayoutByKey[key]?.h ?? 6;
			return Math.max(maxRow, y + h);
		}, 0) + 1;

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
		<div
			className="generated-output-grid grid"
			style={
				{
					gap: `${PORTFOLIO_LAYOUT_GAP}px`,
					"--desktop-row-height": `${PORTFOLIO_LAYOUT_ROW_HEIGHT}px`,
				} as CSSProperties
			}
		>
			{sectionOrder.map((sectionKey, index) => {
				const packed = packedLayoutByKey[sectionKey];
				const desktopPlacementStyle = {
					"--desktop-col-start": String((packed?.x ?? 0) + 1),
					"--desktop-col-span": String(packed?.w ?? 6),
					"--desktop-row-start": String((packed?.y ?? 0) + 1),
					"--desktop-row-span": String(packed?.h ?? 6),
				} as CSSProperties;

				return (
					<motion.div
						key={sectionKey}
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
						className="generated-output-section layout-scroll-content app-card overflow-x-hidden p-2.5 sm:p-4 [overflow-wrap:anywhere]"
						style={desktopPlacementStyle}
					>
						{sectionContentByKey[sectionKey]}
					</motion.div>
				);
			})}

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
				style={
					{
						"--desktop-footer-row-start": String(footerDesktopRowStart),
					} as CSSProperties
				}
			>
				<Footer fullName={data?.fullName} />
			</motion.div>
		</div>
	);
}
