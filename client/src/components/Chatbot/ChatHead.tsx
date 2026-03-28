import me from "@/assets/me.jpeg";
import { IoCloseSharp } from "react-icons/io5";
import useChat from "@/context/Chat/useChat";
import { motion } from "motion/react";
import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";

export default function ChatHead({
	displayName,
	avatarUrl,
}: {
	displayName: string;
	avatarUrl?: string;
}) {
	const { setIsChatOpen } = useChat();
	const prefersReducedMotion = usePrefersReducedMotion();
	const avatar = avatarUrl || me;

	return (
		<motion.button
			type="button"
			aria-label="Open chat"
			onClick={() => setIsChatOpen(true)}
			initial={prefersReducedMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
			animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
			exit={prefersReducedMotion ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
			transition={
				prefersReducedMotion
					? undefined
					: { duration: 0.22, ease: [0.16, 1, 0.3, 1] }
			}
			className="rounded-full group fixed bottom-4 right-4 md:bottom-10 md:right-8 flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-lg transition-[box-shadow,transform] active:scale-[0.98]"
		>
			<div className="relative size-14 md:size-16">
				{/* Avatar */}
				<div className="size-14 md:size-16 rounded-full overflow-hidden border border-(--app-border)">
					<img src={avatar} alt={displayName} />
				</div>

				{/* Active Status */}
				<div className="bg-green-400 rounded-full size-3.5 md:size-4 absolute bottom-0 right-0 border border-(--app-surface)"></div>

				{/* Close Button */}
				<div
					className="group-hover:flex top-0 right-0 size-5 absolute hidden justify-center items-center bg-(--app-surface) text-(--app-text) border border-(--app-border) rounded-full"
				>
					<IoCloseSharp size={14} />
				</div>

				{/* Chat Preview */}
				<div
					className="group-hover:flex hidden rounded-none shadow-[0_2px_10px_-2px_rgba(0,0,0,0.18)] absolute -top-3 -left-40 w-36 bg-(--app-surface) text-(--app-text) border border-(--app-border)"
				>
					<div className="flex flex-col p-3 text-sm">
						<div className="font-semibold">{displayName}</div>
						<div className="font-light text-(--app-muted)">
							Hi, Let's chat!
						</div>
					</div>

					{/* Arrow */}
					<div className="absolute top-[60%] left-full">
						<div
							className={`w-0 h-0 
								border-t-6 border-t-transparent
								border-b-6 border-b-transparent
								border-l-10 border-l-(--app-surface)`}
						></div>
					</div>
				</div>
			</div>
		</motion.button>
	);
}
