export default function ChatIntro() {
	return (
		<div className="py-2 text-xs md:text-sm">
			<p className="">Hi 👋 I’m Deux</p>

			<p className="mt-2">
				I build web apps using <span className="">Laravel</span> and{" "}
				<span className="">React</span>.
			</p>

			<p className="mt-2">
				Feel free to ask me anything about my work, how I build things,
				or what I’ve been working on lately.
			</p>

			<p className="mt-3">Try asking:</p>
			<ul className="mt-1 list-disc list-inside">
				<li>What projects have you built?</li>
				<li>What’s your tech stack?</li>
				<li>How do you debug issues?</li>
			</ul>

			<p className="mt-3">Or just say hi 🙂</p>
		</div>
	);
}
