import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookOpen, CheckCircle2, Compass, Rocket } from "lucide-react";

const onboardingSteps = [
	"Create an account from /signup and open your dashboard.",
	"Set your public URL slug so your portfolio link matches your brand.",
	"Open Portfolio Builder and complete profile, story, career, and stack tabs.",
	"Save and verify your live public portfolio page.",
	"Create a draft version before major edits so you can publish safely.",
	"Open Resume Builder, complete sections, and fix hard validation errors.",
	"Preview and download resume PDF, then share your final links.",
];

export default function UserGuidePage() {
	return (
		<main className="mx-auto w-full max-w-5xl space-y-6 pb-12">
			<section className="rounded-2xl border bg-gradient-to-br from-emerald-500/12 via-background to-sky-500/10 p-6 sm:p-8">
				<Badge variant="outline" className="mb-3 w-fit">
					<BookOpen className="mr-1 size-3.5" />
					User Guide
				</Badge>
				<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
					How to use Dev Portfolio Generator
				</h1>
				<p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
					This page covers all major user features and a step-by-step onboarding flow.
				</p>
				<div className="mt-4 flex flex-wrap gap-2">
					<Link to="/signup" className={buttonVariants({ size: "sm" })}>
						Get Started
					</Link>
					<Link to="/dashboard" className={buttonVariants({ size: "sm", variant: "secondary" })}>
						Open Dashboard
					</Link>
				</div>
			</section>

			<section className="grid gap-4 md:grid-cols-3">
				<Card className="border-border/70 shadow-none">
					<CardHeader className="pb-3">
						<CardTitle className="text-lg">Dashboard</CardTitle>
						<CardDescription>Manage your live URL, versions, and resume quick actions.</CardDescription>
					</CardHeader>
					<CardContent className="text-sm text-muted-foreground">
						Update slug, copy live link, activate versions, and jump to builders.
					</CardContent>
				</Card>
				<Card className="border-border/70 shadow-none">
					<CardHeader className="pb-3">
						<CardTitle className="text-lg">Portfolio Builder</CardTitle>
						<CardDescription>Edit content, layout, and optional AI chat settings.</CardDescription>
					</CardHeader>
					<CardContent className="text-sm text-muted-foreground">
						Includes profile, markdown about, timeline, experiences, tech stack, and custom sections.
					</CardContent>
				</Card>
				<Card className="border-border/70 shadow-none">
					<CardHeader className="pb-3">
						<CardTitle className="text-lg">Resume Builder</CardTitle>
						<CardDescription>Create ATS/Harvard resume formats and export PDF.</CardDescription>
					</CardHeader>
					<CardContent className="text-sm text-muted-foreground">
						Live validation helps you fix blocking issues before PDF export.
					</CardContent>
				</Card>
			</section>

			<Card className="border-border/70 shadow-none">
				<CardHeader>
					<CardTitle className="text-xl">
						<Rocket className="mr-2 inline size-5" />
						Step-by-Step Onboarding
					</CardTitle>
					<CardDescription>Recommended sequence for first-time users.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					{onboardingSteps.map((step, index) => (
						<div key={step} className="flex items-start gap-3 rounded-md border bg-muted/20 px-3 py-2">
							<div className="mt-0.5 rounded-full border px-2 py-0.5 text-xs font-semibold">{index + 1}</div>
							<div className="text-sm">{step}</div>
						</div>
					))}
				</CardContent>
			</Card>

			<Card className="border-border/70 shadow-none">
				<CardHeader>
					<CardTitle className="text-xl">
						<Compass className="mr-2 inline size-5" />
						Feature Notes
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 text-sm text-muted-foreground">
					<div>
						<div className="font-medium text-foreground">Portfolio versions</div>
						<div>Create draft versions from latest, live, or blank base. Activate when ready to publish.</div>
					</div>
					<Separator />
					<div>
						<div className="font-medium text-foreground">Public AI chat</div>
						<div>Chat appears on your public portfolio only when enabled in builder extras.</div>
					</div>
					<Separator />
					<div>
						<div className="font-medium text-foreground">Resume export rules</div>
						<div>Warnings are advisory. Hard validation errors must be resolved before PDF export.</div>
					</div>
					<Separator />
					<div className="flex items-start gap-2 text-foreground">
						<CheckCircle2 className="mt-0.5 size-4 text-emerald-500" />
						<div>
							Best practice: keep one stable live version and do experiments in drafts.
						</div>
					</div>
				</CardContent>
			</Card>
		</main>
	);
}
