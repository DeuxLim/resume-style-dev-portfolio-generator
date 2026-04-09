import SamplePageToggle from "@/components/Landing/SamplePageToggle";

export default function SampleResumePage() {
	return (
		<main className="space-y-4 pb-5 sm:space-y-5 sm:pb-6">
			<section className="v2-panel p-4 sm:p-5">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="text-xs font-semibold tracking-[0.17em] text-muted-foreground">
							SAMPLE OUTPUT
						</p>
						<h1 className="text-xl leading-tight sm:text-2xl">Resume sample</h1>
					</div>
					<SamplePageToggle active="resume" />
				</div>
			</section>

			<section className="overflow-hidden rounded-[1.2rem] border border-border/70 bg-card">
				<iframe
					title="Sample resume output"
					src="/resume.pdf#toolbar=1&navpanes=0"
					className="h-[calc(100vh-16rem)] min-h-[40rem] w-full bg-white"
				/>
			</section>
		</main>
	);
}
