import { samplePortfolio } from "../../../../shared/defaults/portfolio";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function About({ paragraphs }: { paragraphs?: string[] }) {
	const items = paragraphs ?? samplePortfolio.about;

	return (
		<div className="space-y-4">
			<div className="text-base sm:text-lg font-bold">About</div>
			<div className="space-y-3 text-[13px] font-light sm:text-sm">
				{items.map((paragraph, index) => (
					<div
						key={`${index}-${paragraph.slice(0, 24)}`}
						className="markdown-render leading-relaxed"
					>
						<ReactMarkdown remarkPlugins={[remarkGfm]}>{paragraph}</ReactMarkdown>
					</div>
				))}
			</div>
		</div>
	);
}
