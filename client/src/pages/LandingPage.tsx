import { Link } from "react-router";
import { samplePortfolio } from "../../../shared/defaults/portfolio";
import ThemeToggleButton from "@/components/ThemeToggleButton";

const features = [
	"Create an account and get your own public portfolio URL",
	"Edit your profile, work history, projects, stack, and custom sections",
	"Keep the same minimal resume-style layout across every portfolio",
	"Use the app-wide Gemini key or save your own key in settings",
];

export default function LandingPage() {
	return (
		<main className="space-y-4">
			<section className="app-card p-4 sm:p-6 md:p-8">
				<div className="flex items-start justify-between gap-4">
					<div className="space-y-4 max-w-3xl">
						<div className="text-xs uppercase tracking-[0.24em] text-(--app-subtle)">
							Developer Portfolio Builder
						</div>
						<h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-balance">
							Turn this site into a portfolio builder for any developer.
						</h1>
						<p className="text-sm sm:text-base text-(--app-muted) max-w-2xl">
							Developers can sign up, fill out their information, edit sections,
							and publish a clean portfolio that keeps the same minimal vibe as
							your personal site.
						</p>
						<div className="flex flex-wrap gap-2">
							<Link to="/signup" className="app-chip px-4 py-2 font-medium">
								Create account
							</Link>
							<Link to="/login" className="app-chip px-4 py-2 font-medium">
								Log in
							</Link>
							<Link
								to={`/${samplePortfolio.username}`}
								className="app-chip px-4 py-2 font-medium"
							>
								View sample portfolio
							</Link>
						</div>
					</div>
					<ThemeToggleButton />
				</div>
			</section>

			<section className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="app-card p-4 sm:p-5 md:col-span-2">
					<div className="text-base sm:text-lg font-bold">How it works</div>
					<div className="mt-4 grid gap-3 text-sm text-(--app-muted)">
						<div className="app-chip p-3">
							<span className="text-(--app-text) font-medium">01.</span> Sign up
							with your email, username, and password.
						</div>
						<div className="app-chip p-3">
							<span className="text-(--app-text) font-medium">02.</span> Edit
							your profile, timeline, experience, projects, and stack.
						</div>
						<div className="app-chip p-3">
							<span className="text-(--app-text) font-medium">03.</span> Share
							your public page at <code>/your-username</code>.
						</div>
					</div>
				</div>

				<div className="app-card p-4 sm:p-5">
					<div className="text-base sm:text-lg font-bold">What stays simple</div>
					<div className="mt-4 space-y-2 text-sm text-(--app-muted)">
						{features.map((feature) => (
							<div key={feature} className="app-chip p-3">
								{feature}
							</div>
						))}
					</div>
				</div>
			</section>

			<section className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="app-card p-4 sm:p-5">
					<div className="text-base sm:text-lg font-bold">Portfolio preview</div>
					<div className="mt-4 space-y-3 text-sm">
						<div className="app-chip p-3">
							<div className="font-semibold">{samplePortfolio.fullName}</div>
							<div className="text-(--app-muted)">{samplePortfolio.headline}</div>
						</div>
						<div className="app-chip p-3 text-(--app-muted)">
							{samplePortfolio.about[0]}
						</div>
						<div className="grid grid-cols-2 gap-2">
							{samplePortfolio.projects.slice(0, 2).map((project) => (
								<div key={project.id} className="app-chip p-3">
									<div className="font-medium text-sm">{project.name}</div>
									<div className="text-xs text-(--app-muted)">
										{project.description}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				<div className="app-card p-4 sm:p-5">
					<div className="text-base sm:text-lg font-bold">Public URL pattern</div>
					<div className="mt-4 space-y-3 text-sm text-(--app-muted)">
						<div className="app-chip p-3">
							<code>your-domain.vercel.app/deuxlim</code>
						</div>
						<div className="app-chip p-3">
							<code>your-domain.vercel.app/another-dev</code>
						</div>
						<p>
							You still keep your personal portfolio style, but the app becomes a
							shared builder that can host multiple developers.
						</p>
					</div>
				</div>
			</section>
		</main>
	);
}
