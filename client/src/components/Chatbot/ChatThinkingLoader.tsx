import { useEffect, useState } from "react";

const THINKING_WORDS = [
	"Thinking",
	"Discombobulating",
	"Pondering",
	"Calculating",
	"Brewing",
	"Conjuring",
	"Vibing",
	"Contemplating",
	"Caffeinating",
	"Synthesizing",
	"Let me cook",
];

export function ChatThinkingLoader() {
	const [index, setIndex] = useState(0);
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		const interval = setInterval(() => {
			setVisible(false);
			setTimeout(() => {
				setIndex((prev) => (prev + 1) % THINKING_WORDS.length);
				setVisible(true);
			}, 300);
		}, 1800);

		return () => clearInterval(interval);
	}, []);

	return (
		<div
			className="ml-8 px-4 py-2 rounded-none w-fit text-[13px] sm:text-sm text-(--app-muted) bg-(--app-surface-2) border border-(--app-border) transition-opacity duration-300 flex items-end gap-px"
			style={{ opacity: visible ? 1 : 0 }}
		>
			<span>{THINKING_WORDS[index]}</span>
			<span className="inline-flex items-end gap-0.5 ml-0.5 mb-0.75">
				<span
					className="w-1 h-1 rounded-full bg-(--app-subtle) animate-bounce"
					style={{ animationDelay: "0ms" }}
				/>
				<span
					className="w-1 h-1 rounded-full bg-(--app-subtle) animate-bounce"
					style={{ animationDelay: "150ms" }}
				/>
				<span
					className="w-1 h-1 rounded-full bg-(--app-subtle) animate-bounce"
					style={{ animationDelay: "300ms" }}
				/>
			</span>
		</div>
	);
}
