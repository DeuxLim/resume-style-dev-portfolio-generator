import { ensureHref } from "@/lib/portfolio";
import { samplePortfolio } from "../../../../shared/defaults/portfolio";
import type { ProjectItem } from "../../../../shared/types/portfolio.types";

export default function Projects({ items }: { items?: ProjectItem[] }) {
	const projects = items ?? samplePortfolio.projects;

	return (
		<div className="flex flex-col gap-4">
			<div className="text-base sm:text-lg font-bold">Projects</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
				{projects.map((project, index) => {
					const href = ensureHref(project.url);
					return (
						<a
							key={project.id || `${project.name}-${index}`}
							href={href || undefined}
							target={href ? "_blank" : undefined}
							rel={href ? "noreferrer noopener" : undefined}
							aria-disabled={!href}
							className={`app-chip p-2.5 sm:p-4 flex flex-col gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent) ${
								href
									? "cursor-pointer"
									: "cursor-not-allowed opacity-60 pointer-events-none"
							}`}
						>
							<div className="text-sm font-semibold">{project.name}</div>
							<div className="text-xs text-(--app-muted)">
								{project.description}
							</div>

							{href && (
								<div className="mt-2">
									<span className="block max-w-full break-all text-[11px] px-2 py-1 rounded-none bg-(--app-surface-2) border border-(--app-border)">
										{project.url}
									</span>
								</div>
							)}
						</a>
					);
				})}
			</div>
		</div>
	);
}
