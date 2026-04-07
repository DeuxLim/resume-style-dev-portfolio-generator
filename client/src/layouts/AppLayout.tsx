import { Outlet, Link, useLocation } from "react-router";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api, apiBaseUrl } from "@/lib/axios.client";
import { sessionQueryKey } from "@/hooks/useSession";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import { useSession } from "@/hooks/useSession";
import { Menu, X } from "lucide-react";

type OpenMenu = "portfolio" | "resume" | null;

export default function AppLayout() {
	const location = useLocation();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const sessionQuery = useSession();
	const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
	const [mobileNavOpen, setMobileNavOpen] = useState(false);
	const navMenusRef = useRef<HTMLDivElement | null>(null);
	const isAuthed = Boolean(sessionQuery.data?.user);
	const username =
		sessionQuery.data?.portfolioSlug ?? sessionQuery.data?.user?.username;
	const publicPortfolioPath = username ? `/${username}` : "";
	const resumePdfHref = `${apiBaseUrl}/resumes/me/pdf`;
	const resumePdfDownloadHref = `${apiBaseUrl}/resumes/me/pdf?download=1`;
	const publicResumePdfHref = username
		? `${apiBaseUrl}/resumes/${encodeURIComponent(username)}/pdf?download=1`
		: "";
	const logoutMutation = useMutation({
		mutationFn: async () => api.post("/auth/logout"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
			navigate("/");
		},
	});

	const navActiveClass =
		"bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/35 dark:text-emerald-300";
	const navMenuItemActiveClass =
		"bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-500";
	const isDashboardActive = location.pathname === "/dashboard";
	const isEditorActive =
		location.pathname.startsWith("/dashboard/edit") ||
		location.pathname.startsWith("/dashboard/create");
	const isResumeBuilderActive = location.pathname.startsWith("/dashboard/resume");
	const isHomeActive = location.pathname === "/";
	const isSampleActive = location.pathname.startsWith("/sample");
	const isGuideActive = location.pathname.startsWith("/guide");

	useEffect(() => {
		const onPointerDown = (event: PointerEvent) => {
			if (!navMenusRef.current?.contains(event.target as Node)) {
				setOpenMenu(null);
			}
		};

		const onEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpenMenu(null);
			}
		};

		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onEscape);

		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onEscape);
		};
	}, []);

	useEffect(() => {
		setOpenMenu(null);
		setMobileNavOpen(false);
	}, [location.pathname]);

	return (
		<div className="app-shell relative min-h-dvh bg-[radial-gradient(circle_at_top_right,#0ea5e91f,transparent_40%),radial-gradient(circle_at_top_left,#22c55e14,transparent_35%)] bg-cover bg-center">
			<div className="pointer-events-none absolute inset-0 opacity-70">
				<div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
				<div className="absolute top-24 -right-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
			</div>

			<div className="relative mx-auto max-w-6xl px-3 pt-3 pb-8 sm:px-4 sm:pt-5 sm:pb-10 md:pt-6">
				<header className="mb-5 rounded-2xl bg-background/70 p-3 sm:p-4 backdrop-blur supports-[backdrop-filter]:bg-background/55">
					<div className="flex items-center gap-2 sm:gap-3">
						<Link
							to="/"
							className="inline-flex min-w-0 flex-1 items-center rounded-md bg-muted/35 px-3 py-2 text-[11px] font-semibold tracking-[0.08em] text-foreground/90 transition-colors hover:bg-muted/55 sm:text-xs"
						>
							<span className="truncate">Resume-style Web Dev Portfolio Generator</span>
						</Link>
						<div className="sm:hidden">
							<ThemeToggleButton />
						</div>
						<button
							type="button"
							className={cn(
								buttonVariants({ size: "sm", variant: "ghost" }),
								"sm:hidden",
							)}
							aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
							aria-expanded={mobileNavOpen}
							onClick={() => setMobileNavOpen((current) => !current)}
						>
							{mobileNavOpen ? <X className="size-4" /> : <Menu className="size-4" />}
						</button>
					</div>

					<div className="mt-3 hidden items-center justify-between gap-2 sm:flex">
						{isAuthed ? (
							<div ref={navMenusRef} className="flex flex-wrap items-center gap-1.5">
								<Link
									to="/dashboard"
									className={cn(
										buttonVariants({ size: "sm", variant: "ghost" }),
										isDashboardActive && navActiveClass,
									)}
									onClick={() => setOpenMenu(null)}
								>
									Dashboard
								</Link>
								<Link
									to="/guide"
									className={cn(
										buttonVariants({ size: "sm", variant: "ghost" }),
										isGuideActive && navActiveClass,
									)}
									onClick={() => setOpenMenu(null)}
								>
									User guide
								</Link>

								<div className="group relative">
									<button
										type="button"
										className={cn(
											buttonVariants({ size: "sm", variant: "ghost" }),
											"cursor-pointer",
											isEditorActive && navActiveClass,
											openMenu === "portfolio" && "bg-accent text-accent-foreground",
										)}
										aria-expanded={openMenu === "portfolio"}
										aria-haspopup="menu"
										onClick={() =>
											setOpenMenu((current) => (current === "portfolio" ? null : "portfolio"))
										}
									>
										Portfolio builder
									</button>
									{openMenu === "portfolio" ? (
										<div
											className="absolute left-0 top-[calc(100%+0.35rem)] z-50 min-w-52 rounded-xl border border-border/90 bg-popover p-1.5 text-popover-foreground opacity-100 shadow-2xl ring-1 ring-border/60"
											role="menu"
										>
											<div className="flex flex-col gap-1">
												<Link
													to="/dashboard/edit"
													className={cn(
														buttonVariants({ size: "sm", variant: "ghost" }),
														"justify-start",
														isEditorActive && navMenuItemActiveClass,
													)}
													role="menuitem"
													onClick={() => setOpenMenu(null)}
												>
													Edit portfolio
												</Link>
												<Link
													to="/dashboard?newVersion=1"
													className={cn(
														buttonVariants({ size: "sm", variant: "ghost" }),
														"justify-start",
													)}
													role="menuitem"
													onClick={() => setOpenMenu(null)}
												>
													New version
												</Link>
												{publicPortfolioPath ? (
													<Link
														to={publicPortfolioPath}
														target="_blank"
														rel="noopener noreferrer"
														className={cn(
															buttonVariants({ size: "sm", variant: "ghost" }),
															"justify-start",
															location.pathname === publicPortfolioPath &&
																navMenuItemActiveClass,
														)}
														role="menuitem"
														onClick={() => setOpenMenu(null)}
													>
														My portfolio
													</Link>
												) : null}
											</div>
										</div>
									) : null}
								</div>

								<div className="group relative">
									<button
										type="button"
										className={cn(
											buttonVariants({ size: "sm", variant: "ghost" }),
											"cursor-pointer",
											isResumeBuilderActive && navActiveClass,
											openMenu === "resume" && "bg-accent text-accent-foreground",
										)}
										aria-expanded={openMenu === "resume"}
										aria-haspopup="menu"
										onClick={() =>
											setOpenMenu((current) => (current === "resume" ? null : "resume"))
										}
									>
										Resume builder
									</button>
									{openMenu === "resume" ? (
										<div
											className="absolute left-0 top-[calc(100%+0.35rem)] z-50 min-w-52 rounded-xl border border-border/90 bg-popover p-1.5 text-popover-foreground opacity-100 shadow-2xl ring-1 ring-border/60"
											role="menu"
										>
											<div className="flex flex-col gap-1">
												<Link
													to="/dashboard/resume"
													className={cn(
														buttonVariants({ size: "sm", variant: "ghost" }),
														"justify-start",
														isResumeBuilderActive && navMenuItemActiveClass,
													)}
													role="menuitem"
													onClick={() => setOpenMenu(null)}
												>
													Open resume builder
												</Link>
												<a
													href={resumePdfHref}
													target="_blank"
													rel="noopener noreferrer"
													className={cn(
														buttonVariants({ size: "sm", variant: "ghost" }),
														"justify-start",
													)}
													role="menuitem"
													onClick={() => setOpenMenu(null)}
												>
													Preview PDF
												</a>
												<a
													href={resumePdfDownloadHref}
													target="_blank"
													rel="noopener noreferrer"
													className={cn(
														buttonVariants({ size: "sm", variant: "ghost" }),
														"justify-start",
													)}
													role="menuitem"
													onClick={() => setOpenMenu(null)}
												>
													Download PDF
												</a>
												{publicResumePdfHref ? (
													<a
														href={publicResumePdfHref}
														target="_blank"
														rel="noopener noreferrer"
														className={cn(
															buttonVariants({ size: "sm", variant: "ghost" }),
															"justify-start",
														)}
														role="menuitem"
														onClick={() => setOpenMenu(null)}
													>
														Public resume PDF
													</a>
												) : null}
											</div>
										</div>
									) : null}
								</div>
								<button
									type="button"
									className={buttonVariants({ size: "sm", variant: "ghost" })}
									onClick={() => logoutMutation.mutate()}
									disabled={logoutMutation.isPending}
								>
									{logoutMutation.isPending ? "Logging out..." : "Log out"}
								</button>
							</div>
						) : (
							<div className="flex flex-wrap items-center gap-6 px-1">
								<Link
									to="/"
									className={cn(
										"text-[1.04rem] font-semibold tracking-tight text-foreground/82 transition-colors hover:text-foreground",
										isHomeActive && "text-foreground",
									)}
								>
									Home
								</Link>
								<Link
									to="/sample"
									className={cn(
										"text-[1.04rem] font-semibold tracking-tight text-foreground/82 transition-colors hover:text-foreground",
										isSampleActive && "text-foreground",
									)}
								>
									Sample output
								</Link>
								<Link
									to="/guide"
									className={cn(
										"text-[1.04rem] font-semibold tracking-tight text-foreground/82 transition-colors hover:text-foreground",
										isGuideActive && "text-foreground",
									)}
								>
									User guide
								</Link>
								<Link
									to="/login"
									className="text-[1.04rem] font-semibold tracking-tight text-foreground/82 transition-colors hover:text-foreground"
								>
									Log in
								</Link>
								<Link
									to="/signup"
									className={cn(
										buttonVariants({ size: "sm" }),
										"rounded-2xl px-4 text-[1.02rem] font-semibold",
									)}
								>
									Create account
								</Link>
							</div>
						)}
						<ThemeToggleButton />
					</div>

					{mobileNavOpen ? (
						<div className="mt-3 space-y-2 rounded-xl border border-border/80 bg-background/90 p-2 sm:hidden">
							{isAuthed ? (
								<>
									<Link
										to="/dashboard"
										className={cn(
											buttonVariants({ size: "sm", variant: "ghost" }),
											"w-full justify-start",
											isDashboardActive && navActiveClass,
										)}
										onClick={() => setMobileNavOpen(false)}
									>
										Dashboard
									</Link>
									<Link
										to="/guide"
										className={cn(
											buttonVariants({ size: "sm", variant: "ghost" }),
											"w-full justify-start",
											isGuideActive && navActiveClass,
										)}
										onClick={() => setMobileNavOpen(false)}
									>
										User guide
									</Link>
									<div className="px-2 pt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
										Portfolio
									</div>
									<Link
										to="/dashboard/edit"
										className={cn(
											buttonVariants({ size: "sm", variant: "ghost" }),
											"w-full justify-start",
											isEditorActive && navActiveClass,
										)}
										onClick={() => setMobileNavOpen(false)}
									>
										Edit portfolio
									</Link>
									<Link
										to="/dashboard?newVersion=1"
										className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "w-full justify-start")}
										onClick={() => setMobileNavOpen(false)}
									>
										New version
									</Link>
									{publicPortfolioPath ? (
										<Link
											to={publicPortfolioPath}
											target="_blank"
											rel="noopener noreferrer"
											className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "w-full justify-start")}
											onClick={() => setMobileNavOpen(false)}
										>
											My portfolio
										</Link>
									) : null}
									<div className="px-2 pt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
										Resume
									</div>
									<Link
										to="/dashboard/resume"
										className={cn(
											buttonVariants({ size: "sm", variant: "ghost" }),
											"w-full justify-start",
											isResumeBuilderActive && navActiveClass,
										)}
										onClick={() => setMobileNavOpen(false)}
									>
										Open resume builder
									</Link>
									<a
										href={resumePdfHref}
										target="_blank"
										rel="noopener noreferrer"
										className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "w-full justify-start")}
										onClick={() => setMobileNavOpen(false)}
									>
										Preview PDF
									</a>
									<a
										href={resumePdfDownloadHref}
										target="_blank"
										rel="noopener noreferrer"
										className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "w-full justify-start")}
										onClick={() => setMobileNavOpen(false)}
									>
										Download PDF
									</a>
									{publicResumePdfHref ? (
										<a
											href={publicResumePdfHref}
											target="_blank"
											rel="noopener noreferrer"
											className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "w-full justify-start")}
											onClick={() => setMobileNavOpen(false)}
										>
											Public resume PDF
										</a>
									) : null}
									<button
										type="button"
										className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "w-full justify-start")}
										onClick={() => {
											setMobileNavOpen(false);
											logoutMutation.mutate();
										}}
										disabled={logoutMutation.isPending}
									>
										{logoutMutation.isPending ? "Logging out..." : "Log out"}
									</button>
								</>
							) : (
								<>
									<Link
										to="/"
										className={cn(
											buttonVariants({ size: "sm", variant: "ghost" }),
											"w-full justify-start",
											isHomeActive && navActiveClass,
										)}
										onClick={() => setMobileNavOpen(false)}
									>
										Home
									</Link>
									<Link
										to="/sample"
										className={cn(
											buttonVariants({ size: "sm", variant: "ghost" }),
											"w-full justify-start",
											isSampleActive && navActiveClass,
										)}
										onClick={() => setMobileNavOpen(false)}
									>
										Sample output
									</Link>
									<Link
										to="/guide"
										className={cn(
											buttonVariants({ size: "sm", variant: "ghost" }),
											"w-full justify-start",
											isGuideActive && navActiveClass,
										)}
										onClick={() => setMobileNavOpen(false)}
									>
										User guide
									</Link>
									<Link
										to="/login"
										className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "w-full justify-start")}
										onClick={() => setMobileNavOpen(false)}
									>
										Log in
									</Link>
									<Link
										to="/signup"
										className={cn(buttonVariants({ size: "sm" }), "w-full justify-start")}
										onClick={() => setMobileNavOpen(false)}
									>
										Create account
									</Link>
								</>
							)}
						</div>
					) : null}
				</header>

				<Outlet />
			</div>
		</div>
	);
}
