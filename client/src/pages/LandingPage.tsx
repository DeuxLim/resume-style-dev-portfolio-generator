import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	ArrowRight,
	CheckCircle2,
	CopyCheck,
	Eye,
	LayoutTemplate,
	Rocket,
	Sparkles,
	WandSparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PortfolioMiniPreview from "@/components/Landing/PortfolioMiniPreview";

const pillars = [
	{
		title: "Fast Setup",
		description:
			"Start from a ready structure, fill your details, and publish without building a site from scratch.",
		icon: Rocket,
	},
	{
		title: "Readable Portfolio Layout",
		description:
			"Sections are organized like modern developer portfolios so recruiters can scan your strongest work quickly.",
		icon: LayoutTemplate,
	},
	{
		title: "Version Control for Content",
		description:
			"Keep multiple versions for different roles and choose which one stays live on your public URL.",
		icon: CopyCheck,
	},
];

export default function LandingPage() {
	return (
		<main className="mx-auto w-full max-w-[88rem] space-y-14 pb-20 sm:space-y-20 sm:pb-28">
			<section className="grid items-start gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
				<div className="space-y-8 sm:space-y-10">
					<Badge variant="secondary" className="w-fit px-3 py-1">
						<Sparkles className="mr-1 size-3.5" />
						Resume-Style Web Dev Portfolio
					</Badge>

					<div className="space-y-5 sm:space-y-6">
						<h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
							Build a resume-style web developer portfolio in one sitting.
						</h1>
						<p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
							Write once, publish once, and keep your link updated. The builder
							uses a resume-style layout recruiters already know how to scan.
						</p>
					</div>

					<div className="flex flex-wrap gap-4">
						<Link to="/signup" className={buttonVariants({ size: "lg" })}>
							Create account
						</Link>
						<Link
							to="/sample"
							className={buttonVariants({ size: "lg", variant: "outline" })}
						>
							View full sample
						</Link>
						<Link
							to="/login"
							className={buttonVariants({ size: "lg", variant: "ghost" })}
						>
							Log in
						</Link>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="rounded-xl border bg-background/80 p-5 sm:p-6">
							<div className="text-sm font-medium">Recruiter-friendly flow</div>
							<div className="mt-1 text-sm text-muted-foreground">
								Intro, experience, projects, and stack in a clear reading order.
							</div>
						</div>
						<div className="rounded-xl border bg-background/80 p-5 sm:p-6">
							<div className="text-sm font-medium">Stable public link</div>
							<div className="mt-1 text-sm text-muted-foreground">
								Your URL stays the same while you improve content over time.
							</div>
						</div>
					</div>
				</div>

				<Card className="border-border/70 bg-gradient-to-br from-sky-500/10 via-background to-emerald-500/5 shadow-none">
					<CardHeader className="space-y-4 p-6 pb-4 sm:p-8 sm:pb-5">
						<Badge variant="outline" className="w-fit border-sky-400/50 bg-sky-500/10">
							<Eye className="mr-1 size-3.5" />
							Sample Preview
						</Badge>
						<CardTitle className="text-2xl leading-tight sm:text-3xl">
							Quick look at the generated style
						</CardTitle>
						<CardDescription className="text-sm sm:text-base">
							A compact side preview so you can scan the resume-style layout at a glance.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-5 p-6 pt-0 sm:p-8 sm:pt-0">
						<PortfolioMiniPreview />
						<div className="rounded-md border bg-background/90 px-3 py-2 text-sm font-medium">
							your-domain.com/your-username
						</div>
						<div className="rounded-md border bg-background/70 px-3 py-2 text-sm text-muted-foreground">
							Want to inspect the full layout? Scroll to the featured sample section.
						</div>
						<Link
							to="/signup"
							className={cn(buttonVariants({ variant: "outline" }), "w-full")}
						>
							Start building <ArrowRight className="size-4" />
						</Link>
					</CardContent>
				</Card>
			</section>

			<section className="space-y-4">
				<div className="space-y-2">
					<Badge variant="secondary" className="w-fit">
						<Eye className="mr-1 size-3.5" />
						Featured Resume-Style Sample
					</Badge>
					<h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
						Full-size sample portfolio output
					</h2>
					<p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
						This larger preview highlights spacing, section hierarchy, and readability
						of the final resume-style portfolio page.
					</p>
				</div>
				<Card className="border-border/70 bg-gradient-to-br from-sky-500/10 via-background to-emerald-500/5 shadow-none">
					<CardContent className="space-y-5 p-6 sm:p-8">
						<PortfolioMiniPreview large />
						<div className="rounded-md border bg-background/90 px-3 py-2 text-sm font-medium">
							your-domain.com/your-username
						</div>
						<Link to="/sample" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
							Open full sample page <ArrowRight className="size-4" />
						</Link>
					</CardContent>
				</Card>
			</section>

			<section className="grid grid-cols-1 gap-6 md:grid-cols-3">
				{pillars.map((pillar) => (
					<Card key={pillar.title} className="border-border/70 bg-background/75 shadow-none">
						<CardHeader className="gap-4 p-6 sm:p-7">
							<div className="flex size-9 items-center justify-center rounded-lg border bg-muted/40">
								<pillar.icon className="size-4 text-muted-foreground" />
							</div>
							<CardTitle className="text-lg">{pillar.title}</CardTitle>
							<CardDescription>{pillar.description}</CardDescription>
						</CardHeader>
					</Card>
				))}
			</section>

			<section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<Card className="border-border/70 shadow-none">
					<CardHeader className="p-6 pb-3 sm:p-7 sm:pb-4">
						<CardTitle className="text-xl">How it works</CardTitle>
					</CardHeader>
					<CardContent className="space-y-5 p-6 pt-2 text-sm sm:p-7 sm:pt-2 sm:text-base">
						<div className="flex items-start gap-3">
							<div className="mt-0.5 rounded-md border bg-muted/30 px-2 py-0.5 text-xs font-semibold">
								1
							</div>
							<div>Create an account and open your portfolio dashboard.</div>
						</div>
						<Separator />
						<div className="flex items-start gap-3">
							<div className="mt-0.5 rounded-md border bg-muted/30 px-2 py-0.5 text-xs font-semibold">
								2
							</div>
							<div>Fill guided sections for intro, experience, projects, and stack.</div>
						</div>
						<Separator />
						<div className="flex items-start gap-3">
							<div className="mt-0.5 rounded-md border bg-muted/30 px-2 py-0.5 text-xs font-semibold">
								3
							</div>
							<div>Publish your version and keep iterating from the editor anytime.</div>
						</div>
					</CardContent>
				</Card>
				<Card className="border-border/70 shadow-none">
					<CardHeader className="p-6 pb-3 sm:p-7 sm:pb-4">
						<CardTitle className="text-xl">Why developers use this</CardTitle>
						<CardDescription>
							Clean output and practical editing flow.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4 p-6 pt-2 text-sm text-muted-foreground sm:p-7 sm:pt-2">
						<div className="flex items-start gap-2 rounded-md border px-3 py-2">
							<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
							Portfolio output stays consistent and professional.
						</div>
						<div className="flex items-start gap-2 rounded-md border px-3 py-2">
							<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
							Update content without rebuilding your site each time.
						</div>
						<div className="flex items-start gap-2 rounded-md border px-3 py-2">
							<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
							Easy control of what recruiters see on your live link.
						</div>
					</CardContent>
				</Card>
			</section>

			<section className="rounded-2xl border bg-gradient-to-r from-muted/40 via-background to-muted/40 p-8 sm:p-10">
				<div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
					<div className="space-y-2">
						<div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
							<WandSparkles className="size-4" />
							Ready to publish your own version?
						</div>
						<h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
							Start from the sample, then make it yours.
						</h2>
					</div>
					<Link to="/signup" className={buttonVariants({ size: "lg" })}>
						Create account <ArrowRight className="size-4" />
					</Link>
				</div>
			</section>
		</main>
	);
}
