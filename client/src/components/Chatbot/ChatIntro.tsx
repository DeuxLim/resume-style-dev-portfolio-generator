export default function ChatIntro({ displayName }: { displayName: string }) {
	return (
		<div className="py-2 text-xs md:text-sm">
			<p className="">Hi, I’m {displayName}</p>

			<p className="mt-2">
				Ask about my work, projects, stack, and the kind of things I build.
			</p>

			<p className="mt-2">
				The answers come from the portfolio data on this page, so it stays
				focused on what’s actually listed here.
			</p>

			<p className="mt-3">Try asking:</p>
			<ul className="mt-1 list-disc list-inside">
				<li>What projects have you built?</li>
				<li>What’s your tech stack?</li>
				<li>How do you debug issues?</li>
			</ul>
			<p className="mt-3">Or just say hi.</p>
		</div>
	);
}
