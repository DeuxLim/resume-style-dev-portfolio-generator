import { useEffect, useState, type ReactNode } from "react";
import ThemeContext from "./ThemeContext";
import type { Theme } from "@/types/theme.types";

export default function ThemeProvider({ children }: { children: ReactNode }) {
	const [isManuallySet, setIsManuallySet] = useState(() => {
		const stored = localStorage.getItem("theme");
		return stored === "light" || stored === "dark";
	});

	// 1. initialize from localStorage (fallback to system preference)
	const [theme, setTheme] = useState<Theme>(() => {
		const stored = localStorage.getItem("theme");
		if (stored === "light" || stored === "dark") return stored;

		return window.matchMedia?.("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
	});

	// 2. toggle (pure)
	const toggleTheme = () => {
		setIsManuallySet(true);
		const html = document.documentElement;
		html.classList.add("theme-switching");
		window.setTimeout(() => {
			html.classList.remove("theme-switching");
		}, 260);
		setTheme((prev) => (prev === "light" ? "dark" : "light"));
	};

	// 3. sync to DOM
	useEffect(() => {
		const html = document.documentElement;

		if (theme === "dark") {
			html.classList.add("dark");
		} else {
			html.classList.remove("dark");
		}
	}, [theme]);

	// 4. persist to localStorage (only after manual override)
	useEffect(() => {
		if (isManuallySet) {
			localStorage.setItem("theme", theme);
		} else {
			localStorage.removeItem("theme");
		}
	}, [theme, isManuallySet]);

	// 5. listen to system changes (only if no manual override)
	useEffect(() => {
		const media = window.matchMedia("(prefers-color-scheme: dark)");

		const handleChange = (e: MediaQueryListEvent) => {
			if (!isManuallySet) {
				setTheme(e.matches ? "dark" : "light");
			}
		};

		media.addEventListener("change", handleChange);

		return () => {
			media.removeEventListener("change", handleChange);
		};
	}, [isManuallySet]);

	return (
		<ThemeContext.Provider
			value={{ theme, toggleTheme, isDarkMode: theme === "dark" }}
		>
			{children}
		</ThemeContext.Provider>
	);
}
