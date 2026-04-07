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
			className="inline-flex h-7 w-9 items-center justify-center rounded-lg bg-background/80 transition-colors focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:outline-none active:scale-[0.98] sm:h-8 sm:w-10"
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
