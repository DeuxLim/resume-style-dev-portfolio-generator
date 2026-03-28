import { GitHubCalendar } from "react-github-calendar";
import useTheme from "@/context/Theme/useTheme";
import { useEffect, useState } from "react";

export default function Heatmap() {
	const { isDarkMode } = useTheme();
	const [isCompact, setIsCompact] = useState(false);

	useEffect(() => {
		const mediaQuery = window.matchMedia?.("(max-width: 640px)");
		if (!mediaQuery) return;

		const handleChange = () => setIsCompact(mediaQuery.matches);
		handleChange();
		mediaQuery.addEventListener("change", handleChange);

		return () => mediaQuery.removeEventListener("change", handleChange);
	}, []);

	return (
		<div className="space-y-4 w-full">
			<div className="text-base sm:text-lg font-bold">Daily Coding Heat Map</div>

			<div className="w-full overflow-x-auto">
				<GitHubCalendar
					username="deuxlim"
					blockSize={isCompact ? 10 : 12}
					blockMargin={isCompact ? 2 : 3}
					fontSize={isCompact ? 11 : 13}
					style={{ margin: "0 auto" }}
					transformData={(contributions) => {
						const now = new Date();
						const sixMonthsAgo = new Date();
						sixMonthsAgo.setMonth(now.getMonth() - 6);

						return contributions.filter((day) => {
							const date = new Date(day.date);
							return date >= sixMonthsAgo;
						});
					}}
					theme={{
						light: [
							"#ebedf0", // empty (slightly darker than default)
							"#9be9a8", // low
							"#40c463", // medium
							"#30a14e", // high
							"#216e39", // very high
						],
						...(isDarkMode && {
							dark: [
								"#161b22",
								"#0e4429",
								"#006d32",
								"#26a641",
								"#39d353",
							],
						}),
					}}
					colorScheme={isDarkMode ? "dark" : "light"}
				/>
			</div>
		</div>
	);
}
