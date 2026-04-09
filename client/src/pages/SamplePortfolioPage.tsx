import Home from "@/pages/Home";
import SamplePageToggle from "@/components/Landing/SamplePageToggle";

export default function SamplePortfolioPage() {
	return (
		<>
			<section className="v2-panel mb-3 p-4 sm:mb-4 sm:p-5">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="text-xs font-semibold tracking-[0.17em] text-muted-foreground">
							SAMPLE OUTPUT
						</p>
						<h1 className="text-xl leading-tight sm:text-2xl">Portfolio sample</h1>
					</div>
					<SamplePageToggle active="portfolio" />
				</div>
			</section>
			<Home />
		</>
	);
}
