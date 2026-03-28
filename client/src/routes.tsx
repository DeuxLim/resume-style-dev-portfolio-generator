import { createBrowserRouter } from "react-router";
import PortfolioLayout from "./layouts/PortfolioLayout";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import DashboardPage from "@/pages/DashboardPage";
import PortfolioPage from "@/pages/PortfolioPage";

const routes = createBrowserRouter([
	{
		path: "/",
		element: <PortfolioLayout />,
		children: [
			{ index: true, Component: LandingPage },
			{ path: "login", Component: LoginPage },
			{ path: "signup", Component: SignupPage },
			{ path: "dashboard", Component: DashboardPage },
			{ path: ":username", Component: PortfolioPage },
		],
	},
]);

export default routes;
