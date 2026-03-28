const experiences = [
	{
		role: "Full-Stack Developer",
		fnName: "FullStackDeveloper",
		company: "Orro Group",
		period: "Mar 2023 — Present",
		highlights: [
			"Develop and maintain a large-scale enterprise platform for monitoring, ticketing, and workflow automation using Laravel, JavaScript/jQuery, MySQL, and Bootstrap",
			"Lead integrations with external systems (Jira, ServiceNow, Freshservice), collaborating directly with client engineers to deliver reliable, real-time data synchronization",
			"Build AI-powered features using Azure OpenAI to enhance automation and improve internal operational efficiency",
			"Design and implement network automation solutions (device backups, remote command execution, monitoring) using SSH and REST APIs",
			"Create event-driven automation workflows that reduce manual intervention and significantly improve incident response times",
			"Consistently deliver bug fixes, performance optimizations, and UX improvements, contributing to system stability and scalability",
		],
	},
	{
		role: "Developer Intern",
		fnName: "DeveloperIntern",
		company: "Orro Group",
		period: "Mar 2023 — Jun 2023",
		highlights: [
			"Supported development of a CRM system across frontend and backend",
			"Fixed bugs and assisted in feature enhancements, improving system stability",
			"Worked closely with senior developers, gaining hands-on experience in production workflows",
		],
	},
];

export default function Experience() {
	// Build a flat list of lines with their content and line numbers
	const lines: { content: React.ReactNode }[] = [];

	experiences.forEach((exp, i) => {
		// comment line
		lines.push({
			content: (
				<span className="text-(--app-subtle) text-[11px] sm:text-xs">
					{`// ${String(i + 1).padStart(2, "0")} — ${exp.company} · ${exp.period}`}
				</span>
			),
		});
		// function declaration
		lines.push({
			content: (
				<span className="text-xs sm:text-[13px]">
					<span className="text-(--app-subtle)">function </span>
					<span className="font-semibold text-(--app-text)">
						{exp.fnName}
					</span>
					<span className="text-(--app-subtle)">() {"{"}</span>
				</span>
			),
		});
		// highlights
		exp.highlights.forEach((item) => {
			lines.push({
				content: (
					<span className="flex gap-2 pl-4 text-[11.5px] sm:text-[12.5px] leading-snug">
						<span className="text-(--app-subtle) shrink-0">›</span>
						<span className="text-(--app-muted)">{item}</span>
					</span>
				),
			});
		});
		// closing brace
		lines.push({
			content: (
				<span className="text-(--app-subtle) text-xs sm:text-[13px]">
					{"}"}
				</span>
			),
		});
		// spacer (empty line between entries)
		if (i < experiences.length - 1) {
			lines.push({ content: null });
		}
	});

	return (
		<div className="space-y-3">
			{/* Filename bar */}
			<div className="flex items-center gap-2 border-b border-(--app-border) pb-2">
				<span className="text-base sm:text-lg font-bold">
					Experience
				</span>
			</div>

			{/* Lines */}
			<div className="flex flex-col font-mono">
				{lines.map((line, i) => (
					<div
						key={i}
						className="grid grid-cols-[24px_1fr] sm:grid-cols-[28px_1fr] gap-x-2.5 sm:gap-x-3 min-h-5 group"
					>
						<span className="text-[10px] text-right text-(--app-subtle) opacity-40 group-hover:opacity-70 select-none pt-px">
							{line.content !== null ? i + 1 : ""}
						</span>
						<span className="leading-relaxed">{line.content}</span>
					</div>
				))}
			</div>
		</div>
	);
}
