import About from "@/components/Home/About";
import Timeline from "@/components/Home/Timeline";
import Footer from "@/components/Home/Footer";
import Heatmap from "@/components/Home/Heatmap";
import Projects from "@/components/Home/Projects";
import TechStack from "@/components/Home/TechStack";
import Experience from "./Experience";
import { motion } from "motion/react";
import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";
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
	const hasGithubHeatmap = Boolean(data?.githubUsername?.trim());
	const sectionOrder = data?.layout?.sectionOrder?.length
		? data.layout.sectionOrder
		: defaultPortfolioLayout.sectionOrder;

	const sectionSpanByKey = {
		...defaultPortfolioLayout.sectionSpans,
		...(data?.layout?.sectionSpans ?? {}),
	};

	const sectionContentByKey: Record<PortfolioSectionKey, ReactNode> = {
		about: <About paragraphs={data?.about} />,
		timeline: <Timeline items={data?.timeline} />,
		experience: <Experience items={data?.experiences} />,
		tech: <TechStack categories={data?.techCategories} />,
		projects: <Projects items={data?.projects} />,
		heatmap: <Heatmap username={data?.githubUsername} />,
		custom: (
			<div className="space-y-3">
				{data?.customSections?.map((section) => (
					<div key={section.id} className="space-y-2">
						<div className="text-base sm:text-lg font-bold">{section.title}</div>
						<p className="text-sm text-(--app-muted) whitespace-pre-wrap">
							{section.body}
						</p>
					</div>
				))}
			</div>
		),
	};

	const shouldRenderSection = (key: PortfolioSectionKey) => {
		if (key === "heatmap") {
			return hasGithubHeatmap;
		}
		if (key === "custom") {
			return Boolean(data?.customSections?.length);
		}
		return true;
	};

	return (
		<div className="grid grid-cols-4 md:grid-cols-12 gap-3 sm:gap-4">
			{sectionOrder
				.filter((key, index, arr) => arr.indexOf(key) === index)
				.filter(shouldRenderSection)
				.map((sectionKey, index) => (
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
					className={`col-span-4 ${mdSpanClass[sectionSpanByKey[sectionKey] ?? 6]} ${
						sectionKey === "tech" ? "row-span-2" : ""
					} app-card p-2.5 sm:p-4`}
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
