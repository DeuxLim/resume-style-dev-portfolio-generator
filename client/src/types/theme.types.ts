export type Theme = "light" | "dark";

export interface ThemeContextType {
	toggleTheme: () => void;
	theme: Theme;
	isDarkMode: boolean;
}
