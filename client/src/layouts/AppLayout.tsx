import { Outlet, Link, useLocation } from "react-router";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import { useSession } from "@/hooks/useSession";

export default function AppLayout() {
	const location = useLocation();
	const sessionQuery = useSession();
	const isAuthed = Boolean(sessionQuery.data?.user);

	return (
		<div className="app-shell relative min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_right,#0ea5e91f,transparent_40%),radial-gradient(circle_at_top_left,#22c55e14,transparent_35%)] bg-cover bg-center">
			<div className="pointer-events-none absolute inset-0 opacity-70">
				<div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
				<div className="absolute top-24 -right-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
			</div>

			<div className="relative mx-auto max-w-6xl px-3 pt-4 pb-10 sm:px-4 sm:pt-5 md:pt-6">
				<header className="mb-5 rounded-2xl border border-border/70 bg-background/70 p-3 sm:p-4 backdrop-blur supports-[backdrop-filter]:bg-background/55">
					<div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
						<div className="flex items-center gap-2">
							<div className="rounded-md border border-border/70 bg-muted px-2 py-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">
								PORTFOLIO KIT
							</div>
							<p className="hidden text-xs text-muted-foreground sm:block">
								Build, version, and ship developer portfolios
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-2 py-1.5 sm:px-2.5">
							<Link
								to="/"
								className={cn(
									buttonVariants({ size: "sm", variant: "ghost" }),
									location.pathname === "/" && "bg-muted",
								)}
							>
								Home
							</Link>
							<Link
								to="/sample"
								className={buttonVariants({ size: "sm", variant: "ghost" })}
							>
								Sample
							</Link>
							{isAuthed ? (
								<Link
									to="/dashboard"
									className={cn(
										buttonVariants({ size: "sm", variant: "outline" }),
										location.pathname.startsWith("/dashboard") &&
											"bg-muted text-foreground",
									)}
								>
									Dashboard
								</Link>
							) : (
								<>
									<Link
										to="/login"
										className={buttonVariants({ size: "sm", variant: "ghost" })}
									>
										Log in
									</Link>
									<Link to="/signup" className={buttonVariants({ size: "sm" })}>
										Get started
									</Link>
								</>
							)}
							<ThemeToggleButton />
						</div>
					</div>
				</header>

				<Outlet />
			</div>
		</div>
	);
}
