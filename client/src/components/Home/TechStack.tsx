import {
	SiCss,
	SiDocker,
	SiExpress,
	SiGit,
	SiGithub,
	SiHtml5,
	SiJavascript,
	SiJquery,
	SiLaravel,
	SiMongodb,
	SiMysql,
	SiNodedotjs,
	SiOpenai,
	SiPhp,
	SiPostman,
	SiReact,
	SiTailwindcss,
	SiTypescript,
} from "react-icons/si";
import { VscVscode } from "react-icons/vsc";
import { BsClaude } from "react-icons/bs";
import { FaGitlab } from "react-icons/fa6";

export default function TechStack() {
	return (
		<div className="space-y-3 sm:space-y-4">
			<div className="text-base sm:text-lg font-bold">Tech Stack</div>

			{/* Frontend */}
			<div className="space-y-1">
				<div className="font-medium">Frontend</div>
				<div className="flex gap-2 flex-wrap">
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<SiJavascript className="text-lg sm:text-xl text-yellow-300" />
						<div className="text-sm">JavaScript</div>
					</div>
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<SiTypescript className="text-lg sm:text-xl text-blue-500" />
						<div className="text-sm">TypeScript</div>
					</div>
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<SiReact className="text-lg sm:text-xl text-cyan-400" />
						<div className="text-sm">React</div>
					</div>
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<SiJquery className="text-lg sm:text-xl text-blue-600" />
						<div className="text-sm">JQuery</div>
					</div>
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<SiTailwindcss className="text-lg sm:text-xl text-blue-400" />
						<div className="text-sm">TailwindCSS</div>
					</div>
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<SiHtml5 className="text-lg sm:text-xl text-orange-400" />
						<div className="text-sm">HTML</div>
					</div>
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<SiCss className="text-lg sm:text-xl text-blue-600" />
						<div className="text-sm">CSS</div>
					</div>
				</div>
			</div>

			<div className="h-px bg-(--app-border) my-1" />

			{/* Backend */}
			<div className="space-y-1">
				<div className="font-medium">Backend</div>
				<div className="flex gap-2 flex-wrap">
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<SiPhp className="text-xl sm:text-2xl text-blue-600" />
						<div className="text-sm">PHP</div>
					</div>
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<SiNodedotjs className="text-xl sm:text-2xl text-green-600" />
						<div className="text-sm">Node</div>
					</div>
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<SiLaravel className="text-xl sm:text-2xl text-red-500" />
						<div className="text-sm">Laravel</div>
					</div>
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<SiExpress className="text-xl sm:text-2xl" />
						<div className="text-sm">Express</div>
					</div>
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<SiMysql className="text-xl sm:text-2xl text-cyan-600" />
						<div className="text-sm">MySQL</div>
					</div>
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<SiMongodb className="text-xl sm:text-2xl text-green-600" />
						<div className="text-sm">MongoDB</div>
					</div>
				</div>
			</div>

			<div className="h-px bg-(--app-border) my-1" />

			{/* Tools */}
			<div className="space-y-1">
				<div className="font-medium">Others</div>
				<div className="flex gap-2 flex-wrap">
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<SiGit className="text-lg sm:text-xl text-red-500" />
						<div className="text-sm">Git</div>
					</div>
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<VscVscode className="text-lg sm:text-xl text-blue-500" />
						<div className="text-sm">VS Code</div>
					</div>
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<SiGithub className="text-lg sm:text-xl" />
						<div className="text-sm">Github</div>
					</div>
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<FaGitlab className="text-lg sm:text-xl text-orange-600" />
						<div className="text-sm">Gitlab</div>
					</div>
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<SiDocker className="text-lg sm:text-xl text-blue-400" />
						<div className="text-sm">Docker</div>
					</div>
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<BsClaude className="text-lg sm:text-xl text-orange-400" />
						<div className="text-sm">Claude code</div>
					</div>
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<SiOpenai className="text-lg sm:text-xl" />
						<div className="text-sm">OpenAI Codex</div>
					</div>
					<div className="app-chip flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 cursor-pointer">
						<SiPostman className="text-lg sm:text-xl text-orange-400" />
						<div className="text-sm">Postman</div>
					</div>
				</div>
			</div>
		</div>
	);
}
