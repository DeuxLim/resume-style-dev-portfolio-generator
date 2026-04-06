import About from "@/components/Home/About";
import Timeline from "@/components/Home/Timeline";
import Footer from "@/components/Home/Footer";
import Heatmap from "@/components/Home/Heatmap";
import Projects from "@/components/Home/Projects";
import TechStack from "@/components/Home/TechStack";
import Experience from "./Experience";
import { motion } from "motion/react";
import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";
import { getVisibleSectionOrder } from "@/lib/portfolioLayout";
import type { ReactNode } from "react";
import type { PublicPortfolio } from "../../../../shared/types/portfolio.types";
import { defaultPortfolioLayout } from "../../../../shared/defaults/portfolio";
import type { PortfolioSectionKey } from "../../../../shared/types/portfolio.types";

const mdSpanClass: Record<4 | 6 | 8 | 12, string> = {
	4: "md:col-span-4",
	6: "md:col-span-6",
	8: "md:col-span-8",
	12: "md:col-span-12",
};

export default function Content({
	portfolio,
}: {
	portfolio?: PublicPortfolio;
}) {
	const prefersReducedMotion = usePrefersReducedMotion();
	const data = portfolio;
	const sectionOrder = getVisibleSectionOrder(data);

	const sectionSpanByKey = {
		...defaultPortfolioLayout.sectionSpans,
		...(data?.layout?.sectionSpans ?? {}),
	};
	const sectionHeightByKey = {
		...defaultPortfolioLayout.sectionHeights,
		...(data?.layout?.sectionHeights ?? {}),
	};

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
								<p className="text-sm text-(--app-muted) whitespace-pre-wrap">
									{section.body}
								</p>
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
		<div className="grid grid-cols-4 md:grid-cols-12 gap-3 sm:gap-4">
			{sectionOrder.map((sectionKey, index) => (
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
					className={`col-span-4 ${mdSpanClass[sectionSpanByKey[sectionKey] ?? 6]} app-card p-2.5 sm:p-4`}
					style={{ gridRowEnd: `span ${sectionHeightByKey[sectionKey] ?? 6}` }}
				>
					{sectionContentByKey[sectionKey]}
				</motion.div>
			))}

			{/* Footer */}
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
				<Footer fullName={data?.fullName} />
			</motion.div>
		</div>
	);
}
