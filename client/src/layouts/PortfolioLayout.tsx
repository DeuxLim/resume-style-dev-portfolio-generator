import { Outlet } from "react-router";

export default function PortfolioLayout() {
	return (
		<div className="app-shell min-h-dvh bg-cover bg-center">
			<div className="max-w-6xl mx-auto px-3 sm:px-4 pt-5 sm:pt-6 md:pt-8 pb-10">
				<Outlet />
			</div>
		</div>
	);
}
