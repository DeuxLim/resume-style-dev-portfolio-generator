import { createBrowserRouter } from "react-router";
import PortfolioLayout from "./layouts/PortfolioLayout";
import AppLayout from "./layouts/AppLayout";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import DashboardPage from "@/pages/DashboardPage";
import PortfolioPage from "@/pages/PortfolioPage";
import PortfolioEditorPage from "@/pages/PortfolioEditorPage";
import SamplePortfolioPage from "@/pages/SamplePortfolioPage";
import SampleResumePage from "@/pages/SampleResumePage";
import ResumeBuilderPage from "@/pages/ResumeBuilderPage";
import UserGuidePage from "@/pages/UserGuidePage";

const routes = createBrowserRouter([
	{
		path: "/",
		element: <AppLayout />,
		children: [
			{ index: true, Component: LandingPage },
			{ path: "login", Component: LoginPage },
			{ path: "signup", Component: SignupPage },
			{ path: "dashboard", Component: DashboardPage },
			{ path: "dashboard/edit", Component: PortfolioEditorPage },
			{ path: "dashboard/create", Component: PortfolioEditorPage },
			{ path: "dashboard/resume", Component: ResumeBuilderPage },
			{ path: "resume", Component: ResumeBuilderPage },
			{ path: "guide", Component: UserGuidePage },
		],
	},
	{
		path: "/sample",
		element: <AppLayout />,
		children: [
			{ index: true, Component: SamplePortfolioPage },
			{ path: "resume", Component: SampleResumePage },
		],
	},
	{
		path: "/:username",
		element: <PortfolioLayout />,
		children: [{ index: true, Component: PortfolioPage }],
	},
]);

export default routes;
