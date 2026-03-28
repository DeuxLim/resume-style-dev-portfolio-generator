import me from "@/assets/me.jpeg";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import { motion } from "motion/react";
import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";

import {
	IoBriefcase,
	IoCall,
	IoLocationOutline,
	IoLogoGithub,
	IoLogoLinkedin,
	IoMail,
} from "react-icons/io5";
import cover from "@/assets/coverphoto.jpg";

export default function Header() {
	const prefersReducedMotion = usePrefersReducedMotion();

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
			{/* Mobile Profile And Cover */}
			<div
				className="relative w-full md:hidden flex items-center justify-center h-36 sm:h-48 rounded-none bg-cover bg-center border border-(--app-border) overflow-hidden"
				style={{ backgroundImage: `url(${cover})` }}
			>
				<div className="absolute inset-0 bg-(--app-cover-overlay)" />
				<div className="relative md:hidden size-24 sm:size-28 overflow-hidden shrink-0 rounded-full shadow-sm border border-(--app-border)">
					<img
						src={me}
						alt=""
						className="w-full h-full object-cover object-top"
					/>
				</div>
			</div>

			{/* Header */}
			<section className="flex gap-3 md:gap-4 md:h-40 pt-3 sm:pt-4 md:pt-0">
				{/* Profile picture */}
				<div className="hidden h-full md:flex items-center justify-center">
					<div className="md:flex md:h-40 md:w-40 overflow-hidden rounded-none border border-(--app-border)">
						<img
							src={me}
							alt=""
							className="w-full h-full object-cover object-top"
						/>
					</div>
				</div>

				{/* Basic Info */}
				<div className="flex w-full justify-center flex-col p-1 gap-3 sm:gap-4">
					{/* Top */}
					<div className="flex flex-col h-full gap-2">
						<div className="flex flex-col gap-1 min-w-0">
							<div className="flex items-center justify-between">
								<div className="font-semibold text-xl sm:text-3xl md:text-4xl tracking-tight">
									Deux Daniel Lim
								</div>
								<ThemeToggleButton />
							</div>
							<div className="text-xs md:text-sm text-(--app-muted)">
								Full Stack Developer ( Laravel & React )
							</div>
						</div>
						<div className="flex items-center justify-start text-xs gap-1 text-(--app-muted)">
							<IoLocationOutline />
							Metro Manila
						</div>
						<div className="flex items-center justify-start text-xs gap-1 text-(--app-muted)">
							<IoBriefcase />3 years work experience | BS-IT
							Graduate | Cum Laude
						</div>
					</div>
					{/* Bottom */}
					<div className="flex gap-1.5 flex-wrap">
						<button
							type="button"
							title="GitHub"
							aria-label="GitHub"
							className="app-chip flex items-center justify-center gap-1 px-2.5 py-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent)"
						>
							<IoLogoGithub className="text-lg md:text-xl" />
							<div className="md:text-xs md:block font-light hidden">
								Github
							</div>
						</button>
						<button
							type="button"
							title="LinkedIn"
							aria-label="LinkedIn"
							className="app-chip flex items-center justify-center gap-1 px-2.5 py-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent)"
						>
							<IoLogoLinkedin className="text-lg md:text-xl" />
							<div className="md:text-xs md:block font-light hidden">
								LinkedIn
							</div>
						</button>
						<button
							type="button"
							title="Phone"
							aria-label="Phone"
							className="app-chip flex items-center justify-center gap-1 px-2.5 py-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent)"
						>
							<IoCall className="text-lg md:text-xl" />
							<div className="md:text-xs md:block font-light hidden text-nowrap">
								+63 945-428-6156
							</div>
						</button>
						<button
							type="button"
							title="Email"
							aria-label="Email"
							className="app-chip flex items-center justify-center gap-1 px-2.5 py-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent)"
						>
							<IoMail className="text-lg md:text-xl" />
							<div className="md:text-xs md:block font-light hidden">
								limdeux27@gmail.com
							</div>
						</button>
					</div>
				</div>
			</section>
		</motion.div>
	);
}
