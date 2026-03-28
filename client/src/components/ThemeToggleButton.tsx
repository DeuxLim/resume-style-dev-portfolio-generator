import useTheme from "@/context/Theme/useTheme";
import { useState } from "react";
import { IoMdMoon, IoMdSunny } from "react-icons/io";

export default function ThemeToggleButton() {
	const { isDarkMode, toggleTheme } = useTheme();

	const [isAnimating, setIsAnimating] = useState(false);

	const handleToggle = () => {
		setIsAnimating(true);
		toggleTheme();

		setTimeout(() => {
			setIsAnimating(false);
		}, 500);
	};

	return (
		<button
			type="button"
			aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
			className="h-8 w-10 sm:h-9 sm:w-11 inline-flex items-center justify-center rounded-none border border-(--app-border) bg-(--app-surface-2) shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent) active:scale-[0.98]"
			onClick={handleToggle}
		>
			{isDarkMode ? (
				<IoMdSunny
					className={`text-sm sm:text-base text-(--app-accent) ${
						isAnimating ? "motion-safe:animate-spin" : ""
					}`}
				/>
			) : (
				<IoMdMoon className="text-sm sm:text-base text-(--app-accent)" />
			)}
		</button>
	);
}
