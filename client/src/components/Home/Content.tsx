import About from "@/components/Home/About";
import Timeline from "@/components/Home/Timeline";
import Footer from "@/components/Home/Footer";
import Heatmap from "@/components/Home/Heatmap";
import Projects from "@/components/Home/Projects";
import TechStack from "@/components/Home/TechStack";
import Experience from "./Experience";
import { motion } from "motion/react";
import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";

export default function Content() {
	const prefersReducedMotion = usePrefersReducedMotion();

	return (
		<div className="grid grid-cols-4 md:grid-cols-12 gap-3 sm:gap-4">
			{/* About */}
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
				<About />
			</motion.div>

			{/* Experience Timeline */}
			<motion.div
				initial={prefersReducedMotion ? false : { opacity: 0, x: 18 }}
				animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
				transition={
					prefersReducedMotion
						? undefined
						: { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
				}
				className="col-span-4 md:col-span-4 row-span-1 app-card p-2.5 sm:p-4"
			>
				<Timeline />
			</motion.div>

			{/* Experience */}
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
				<Experience />
			</motion.div>

			{/* Tech Stack */}
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
				<TechStack />
			</motion.div>

			{/* Projects */}
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
				<Projects />
			</motion.div>

			{/* Coding Heat Map */}
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
				<Heatmap />
			</motion.div>

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
				<Footer />
			</motion.div>
		</div>
	);
}
