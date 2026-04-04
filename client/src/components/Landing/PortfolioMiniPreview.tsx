import PortfolioView from "@/components/portfolio/PortfolioView";
import { samplePortfolio } from "../../../../shared/defaults/portfolio";

export default function PortfolioMiniPreview({ large = false }: { large?: boolean }) {
	const viewportClass = large ? "h-[30rem] sm:h-[36rem]" : "h-72";
	const scaleClass = large ? "scale-[0.42] sm:scale-[0.5]" : "scale-[0.3] sm:scale-[0.34]";

	return (
		<div className="overflow-hidden rounded-xl border bg-background/95">
			<div className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-2">
				<div className="size-2 rounded-full bg-rose-400" />
				<div className="size-2 rounded-full bg-amber-400" />
				<div className="size-2 rounded-full bg-emerald-400" />
				<div className="ml-2 text-[10px] text-muted-foreground">portfolio preview</div>
			</div>
			<div className={`relative overflow-hidden bg-muted/20 ${viewportClass}`}>
				<div className="pointer-events-none absolute inset-0 flex justify-center overflow-hidden">
					<div className={`origin-top ${scaleClass}`}>
						<div className="w-[1100px] p-3">
							<PortfolioView portfolio={samplePortfolio} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
