const projects = [
	{
		name: "Developer Portfolio",
		description: "Resume-style developer portfolio",
		url: "deux-dev-portfolio.vercel.app",
	},
	{
		name: "Messenger Clone",
		description: "Real-time chat app",
		url: "messenger-clone-iota-vert.vercel.app",
	},
	{
		name: "MILE 365 Run Club",
		description: "Membership system & dashboard",
		url: "mile365-runclub-landing.vercel.app",
	},
	{
		name: "VaultPass",
		description: "Secure password manager",
		url: "",
	},
];

export default function Projects() {
	return (
		<div className="flex flex-col gap-4">
			<div className="text-base sm:text-lg font-bold">Projects</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
				{projects.map((project, index) => (
					<a
						key={index}
						href={project.url ? `https://${project.url}` : undefined}
						target={project.url ? "_blank" : undefined}
						rel={project.url ? "noreferrer noopener" : undefined}
						aria-disabled={!project.url}
						className={`app-chip p-2.5 sm:p-4 flex flex-col gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent) ${
							project.url
								? "cursor-pointer"
								: "cursor-not-allowed opacity-60 pointer-events-none"
						}`}
					>
						<div className="text-sm font-semibold">{project.name}</div>
						<div className="text-xs text-(--app-muted)">
							{project.description}
						</div>

						{project.url && (
							<div className="mt-2">
								<span className="text-[11px] px-2 py-1 rounded-none bg-(--app-surface-2) border border-(--app-border)">
									{project.url}
								</span>
							</div>
						)}
					</a>
				))}
			</div>
		</div>
	);
}
