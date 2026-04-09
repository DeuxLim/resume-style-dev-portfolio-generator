import { Link, Navigate } from "react-router";
import { motion } from "motion/react";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	ArrowUpRight,
	CheckCircle2,
	FileText,
	Layers3,
	MousePointerClick,
	Rocket,
} from "lucide-react";
import PortfolioMiniPreview from "@/components/Landing/PortfolioMiniPreview";
import { useSession } from "@/hooks/useSession";

const workflow = [
	{
		title: "Shape your story",
		description:
			"Fill focused sections for profile, experience, projects, and stack without getting lost in layout settings.",
	},
	{
		title: "Tune with live preview",
		description:
			"Edit and validate in one studio so what you publish and what you export always stay aligned.",
	},
	{
		title: "Ship with confidence",
		description:
			"Publish your live version and export resume PDF from the same source of truth.",
	},
];

const highlights = [
	"Version-safe publishing with live and draft states",
	"Portfolio and resume workflows built from one content foundation",
	"Mobile-ready editing experience with docked navigation",
];

export default function LandingPage() {
	const sessionQuery = useSession();

	if (sessionQuery.isPending) {
		return null;
	}

	if (sessionQuery.data?.user) {
		return <Navigate to="/dashboard" replace />;
	}

	return (
		<main className="space-y-4 pb-5 sm:space-y-5 sm:pb-6">
			<section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-background/85 px-4 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
				<div className="pointer-events-none absolute -top-12 left-10 h-44 w-44 rounded-full bg-indigo-400/20 blur-3xl" />
				<div className="pointer-events-none absolute top-12 right-8 h-52 w-52 rounded-full bg-sky-400/18 blur-3xl" />
				<div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
					<motion.div
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, ease: "easeOut" }}
						className="space-y-6"
					>
						<div className="space-y-4">
							<p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
								PROFILE BUILDER
							</p>
							<h1 className="max-w-2xl text-4xl leading-[0.96] sm:text-5xl lg:text-6xl">
								Build your career site like a premium product release.
							</h1>
							<p className="max-w-xl text-base text-muted-foreground sm:text-lg">
								One workspace for portfolio content, resume export, version control, and
								publishing flow. Designed for clarity, speed, and confidence.
							</p>
						</div>
						<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
							<Link to="/signup" className={buttonVariants({ size: "lg" })}>
								Start free workspace
								<ArrowUpRight className="size-4" />
							</Link>
							<Link to="/sample" className={buttonVariants({ size: "lg", variant: "outline" })}>
								View sample output
							</Link>
						</div>
						<div className="grid gap-3 sm:grid-cols-3">
							<div className="v2-stat px-4 py-3">
								<div className="text-[0.68rem] font-semibold tracking-[0.14em] text-muted-foreground">
									BUILDERS
								</div>
								<div className="mt-1 text-xl font-semibold">2</div>
							</div>
							<div className="v2-stat px-4 py-3">
								<div className="text-[0.68rem] font-semibold tracking-[0.14em] text-muted-foreground">
									PUBLISH MODES
								</div>
								<div className="mt-1 text-xl font-semibold">Live + Draft</div>
							</div>
							<div className="v2-stat px-4 py-3">
								<div className="text-[0.68rem] font-semibold tracking-[0.14em] text-muted-foreground">
									EXPORT
								</div>
								<div className="mt-1 text-xl font-semibold">PDF Ready</div>
							</div>
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, scale: 0.98, y: 18 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						transition={{ duration: 0.65, ease: "easeOut", delay: 0.08 }}
						className="v2-preview-frame overflow-hidden p-4 sm:p-5"
					>
						<div className="mb-4 flex items-center justify-between rounded-2xl border border-border/65 bg-muted/45 px-3 py-2">
							<div>
								<div className="text-xs font-semibold tracking-[0.16em] text-muted-foreground">
									LIVE PREVIEW
								</div>
								<div className="text-sm font-medium">morganreyes.dev</div>
							</div>
							<Link
								to="/sample"
								className={buttonVariants({ variant: "secondary", size: "sm" })}
							>
								Open full sample
							</Link>
						</div>
						<div className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-background/88 p-2">
							<PortfolioMiniPreview large />
						</div>
					</motion.div>
				</div>
			</section>

			<section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
				<div className="v2-panel p-5 sm:p-7">
					<div className="mb-5 flex items-center gap-2">
						<MousePointerClick className="size-4 text-primary" />
						<p className="text-xs font-semibold tracking-[0.17em] text-muted-foreground">
							WORKFLOW
						</p>
					</div>
					<div className="space-y-5">
						{workflow.map((step, index) => (
							<div key={step.title}>
								<div className="flex items-start gap-4">
									<div className="mt-1 inline-flex size-7 items-center justify-center rounded-full bg-primary/13 text-xs font-semibold text-primary">
										{index + 1}
									</div>
									<div>
										<h2 className="text-xl leading-tight sm:text-2xl">{step.title}</h2>
										<p className="mt-2 text-sm text-muted-foreground sm:text-base">
											{step.description}
										</p>
									</div>
								</div>
								{index < workflow.length - 1 ? <Separator className="mt-5" /> : null}
							</div>
						))}
					</div>
				</div>

				<div className="v2-panel flex flex-col justify-between p-5 sm:p-7">
					<div className="space-y-4">
						<p className="text-xs font-semibold tracking-[0.17em] text-muted-foreground">
							WHY IT FEELS DIFFERENT
						</p>
						<h2 className="text-2xl leading-tight sm:text-3xl">
							Designed as a creative workspace, not a generic admin form.
						</h2>
						<ul className="space-y-3">
							{highlights.map((item) => (
								<li key={item} className="flex items-start gap-3 text-sm sm:text-base">
									<CheckCircle2 className="mt-0.5 size-4 text-primary" />
									<span className="text-muted-foreground">{item}</span>
								</li>
							))}
						</ul>
					</div>
					<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
						<Link
							to="/dashboard/edit"
							className={buttonVariants({ variant: "outline", size: "lg" })}
						>
							<Layers3 className="size-4" />
							Try profile builder
						</Link>
						<Link
							to="/resume"
							className={buttonVariants({ variant: "outline", size: "lg" })}
						>
							<FileText className="size-4" />
							Try resume builder
						</Link>
					</div>
				</div>
			</section>

			<section className="v2-panel p-5 sm:p-7">
				<div className="mb-5 flex items-center gap-2">
					<FileText className="size-4 text-primary" />
					<p className="text-xs font-semibold tracking-[0.17em] text-muted-foreground">
						SAMPLE RESUME OUTPUT
					</p>
				</div>
				<div className="space-y-3">
					<h2 className="text-2xl leading-tight sm:text-3xl">ATS-ready resume preview</h2>
					<p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
						Resume export is a first-class feature in Profile Builder. The sample below
						shows the generated PDF output.
					</p>
				</div>
				<div className="mt-6 overflow-hidden rounded-[1.2rem] border border-border/70 bg-card">
					<iframe
						title="Sample resume output"
						src="/resume.pdf#toolbar=0&navpanes=0&scrollbar=0"
						className="h-[30rem] w-full bg-white sm:h-[40rem]"
					/>
				</div>
			</section>

			<section className="v2-panel p-6 sm:p-8">
				<div className="grid gap-8 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
					<div>
						<p className="text-xs font-semibold tracking-[0.17em] text-muted-foreground">
							LAUNCH READY
						</p>
						<h2 className="mt-3 text-3xl leading-[0.97] sm:text-4xl">
							Publish faster without sacrificing polish.
						</h2>
					</div>
					<p className="text-sm text-muted-foreground sm:text-base">
						Create polished public output, keep safe draft iterations, and export resume PDFs
						from the same source data. This keeps your brand, story, and resume aligned.
					</p>
					<Link to="/signup" className={buttonVariants({ size: "lg" })}>
						<Rocket className="size-4" />
						Create account
					</Link>
				</div>
			</section>
		</main>
	);
}
