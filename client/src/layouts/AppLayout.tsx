import { Outlet, Link, useLocation } from "react-router";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { api, apiBaseUrl } from "@/lib/axios.client";
import { sessionQueryKey } from "@/hooks/useSession";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import { useSession } from "@/hooks/useSession";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	BookOpen,
	ExternalLink,
	FileDown,
	FileText,
	LayoutDashboard,
	LogOut,
	Menu,
	PanelsTopLeft,
	Sparkles,
	UserRoundPen,
} from "lucide-react";

export default function AppLayout() {
	const location = useLocation();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const sessionQuery = useSession();
	const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

	const navActiveClass = "bg-primary text-primary-foreground shadow-sm";

	const isDashboardActive = location.pathname === "/dashboard";
	const isEditorActive =
		location.pathname.startsWith("/dashboard/edit") ||
		location.pathname.startsWith("/dashboard/create");
	const isResumeBuilderActive =
		location.pathname.startsWith("/dashboard/resume");
	const isHomeActive = location.pathname === "/";
	const isSampleActive = location.pathname.startsWith("/sample");
	const isGuideActive = location.pathname.startsWith("/guide");

	const desktopAuthedLinks = useMemo(
		() => [
			{
				to: "/dashboard",
				label: "Dashboard",
				active: isDashboardActive,
			},
			{
				to: "/dashboard/edit",
				label: "Profile Builder",
				active: isEditorActive,
			},
			{
				to: "/dashboard/resume",
				label: "Resume Builder",
				active: isResumeBuilderActive,
			},
			{
				to: "/guide",
				label: "Guide",
				active: isGuideActive,
			},
		],
		[
			isDashboardActive,
			isEditorActive,
			isGuideActive,
			isResumeBuilderActive,
		],
	);

	const desktopGuestLinks = useMemo(
		() => [
			{
				to: "/",
				label: "Home",
				active: isHomeActive,
			},
			{
				to: "/sample",
				label: "Sample",
				active: isSampleActive,
			},
			{
				to: "/guide",
				label: "Guide",
				active: isGuideActive,
			},
		],
		[isGuideActive, isHomeActive, isSampleActive],
	);

	const mobileDockItems = isAuthed
		? [
				{
					to: "/dashboard",
					label: "Dashboard",
					icon: LayoutDashboard,
					active: isDashboardActive,
				},
				{
					to: "/dashboard/edit",
					label: "Profile",
					icon: PanelsTopLeft,
					active: isEditorActive,
				},
				{
					to: "/dashboard/resume",
					label: "Resume",
					icon: FileText,
					active: isResumeBuilderActive,
				},
				{
					to: "/guide",
					label: "Guide",
					icon: BookOpen,
					active: isGuideActive,
				},
			]
		: [
				{
					to: "/",
					label: "Home",
					icon: Sparkles,
					active: isHomeActive,
				},
				{
					to: "/sample",
					label: "Sample",
					icon: PanelsTopLeft,
					active: isSampleActive,
				},
				{
					to: "/guide",
					label: "Guide",
					icon: BookOpen,
					active: isGuideActive,
				},
				{
					to: "/login",
					label: "Login",
					icon: UserRoundPen,
					active: location.pathname.startsWith("/login"),
				},
			];

	useEffect(() => {
		setMobileNavOpen(false);
	}, [location.pathname]);

	const shellWidthClass = isEditorActive || isResumeBuilderActive
		? "max-w-[96rem]"
		: isDashboardActive
			? "max-w-[88rem]"
			: "max-w-7xl";
	const headerSpacingClass = "mb-5 sm:mb-6";

	return (
		<div className="app-shell app-ui-shell app-density-compact min-h-dvh pb-24 md:pb-0">
			<div
				className={cn(
					"app-layout-inner relative mx-auto w-full px-3 pt-4 pb-12 sm:px-6 sm:pt-6",
					shellWidthClass,
				)}
			>
				<header className={cn("app-layout-header sticky top-3 z-40", headerSpacingClass)}>
					<div className="v2-shell-header px-3 py-3 sm:px-4">
						<div className="flex items-center gap-2 sm:gap-3">
							<Link
								to="/"
								className="min-w-0 flex-1 px-1 py-1 transition-opacity hover:opacity-80 lg:flex-none"
							>
								<div className="truncate text-[1rem] font-semibold tracking-[0.03em] text-foreground/95">
									Profile Builder
								</div>
							</Link>

							<nav className="hidden min-w-0 flex-1 items-center justify-center gap-3 lg:flex">
								<div className="flex h-9 items-center gap-1.5">
									{(isAuthed
										? desktopAuthedLinks
										: desktopGuestLinks
									).map((entry) => (
										<Link
											key={entry.to}
											to={entry.to}
											className={cn(
												buttonVariants({
													variant: "ghost",
													size: "sm",
												}),
												"rounded-full",
												entry.active && navActiveClass,
											)}
										>
											{entry.label}
										</Link>
									))}
								</div>
								{isAuthed ? (
									<>
										<Separator
											orientation="vertical"
											className="h-9"
										/>
										<div className="flex h-9 items-center gap-2">
											{publicPortfolioPath ? (
												<Link
													to={publicPortfolioPath}
													target="_blank"
													rel="noopener noreferrer"
													className={cn(
														buttonVariants({
															variant: "outline",
															size: "sm",
														}),
														"rounded-full",
													)}
												>
													Live Site
													<ExternalLink className="size-3.5" />
												</Link>
											) : null}
											<a
												href={resumePdfDownloadHref}
												target="_blank"
												rel="noopener noreferrer"
												className={cn(
													buttonVariants({
														variant: "outline",
														size: "sm",
													}),
													"rounded-full",
												)}
											>
												Resume PDF
												<FileDown className="size-3.5" />
											</a>
										</div>
									</>
								) : null}
							</nav>

							<div className="flex items-center gap-2">
								{!isAuthed ? (
									<div className="hidden items-center gap-2 lg:flex">
										<Link
											to="/login"
											className={buttonVariants({
												variant: "ghost",
												size: "sm",
											})}
										>
											Log in
										</Link>
										<Link
											to="/signup"
											className={buttonVariants({
												size: "sm",
											})}
										>
											Create account
										</Link>
									</div>
								) : null}

								<div className="hidden lg:block">
									<ThemeToggleButton />
								</div>
								<Button
									type="button"
									size="icon-sm"
									variant="outline"
									className="lg:hidden"
									onClick={() => setMobileNavOpen(true)}
									aria-label="Open menu"
								>
									<Menu className="size-4" />
								</Button>
							</div>
						</div>
					</div>
				</header>

				<Outlet />
			</div>

			<div className="fixed inset-x-3 bottom-3 z-40 lg:hidden">
				<div className="v2-shell-header grid grid-cols-5 gap-1 p-1.5">
					{mobileDockItems.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							className={cn(
								"flex flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-[0.64rem] font-semibold tracking-[0.04em] text-muted-foreground transition-colors",
								item.active &&
									"bg-primary text-primary-foreground",
							)}
						>
							<item.icon className="size-4" />
							{item.label}
						</Link>
					))}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-auto flex-col gap-0.5 rounded-2xl px-2 py-2 text-[0.64rem] font-semibold tracking-[0.04em] text-muted-foreground"
						onClick={() => setMobileNavOpen(true)}
					>
						<Menu className="size-4" />
						Menu
					</Button>
				</div>
			</div>

			<Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
				<SheetContent side="right" className="w-[88vw] max-w-md p-0">
					<SheetHeader className="border-b border-border/60 px-5 py-4">
						<SheetTitle className="text-base">
							Workspace Menu
						</SheetTitle>
					</SheetHeader>

					<div className="flex h-full flex-col gap-6 overflow-y-auto px-5 py-5">
						<div className="space-y-3">
							<div className="text-xs font-semibold tracking-[0.16em] text-muted-foreground">
								NAVIGATION
							</div>
							<div className="space-y-3">
								{(isAuthed
									? desktopAuthedLinks
									: desktopGuestLinks
								).map((entry) => (
									<Link
										key={entry.to}
										to={entry.to}
										className={cn(
											buttonVariants({
												variant: "outline",
											}),
											"w-full justify-start",
											entry.active &&
												"border-primary/55 bg-primary/12 text-primary",
										)}
									>
										{entry.label}
									</Link>
								))}
							</div>
						</div>

						{isAuthed ? (
							<>
								<div className="space-y-3">
									<div className="text-xs font-semibold tracking-[0.16em] text-muted-foreground">
										PUBLISHING
									</div>
									<div className="space-y-3">
										{publicPortfolioPath ? (
											<Link
												to={publicPortfolioPath}
												target="_blank"
												rel="noopener noreferrer"
												className={cn(
													buttonVariants({
														variant: "outline",
													}),
													"w-full justify-start",
												)}
											>
												<ExternalLink className="size-4" />
												Open Live Portfolio
											</Link>
										) : null}
										<a
											href={resumePdfHref}
											target="_blank"
											rel="noopener noreferrer"
											className={cn(
												buttonVariants({
													variant: "outline",
												}),
												"w-full justify-start",
											)}
										>
											<FileText className="size-4" />
											Preview Resume PDF
										</a>
										<a
											href={resumePdfDownloadHref}
											target="_blank"
											rel="noopener noreferrer"
											className={cn(
												buttonVariants({
													variant: "outline",
												}),
												"w-full justify-start",
											)}
										>
											<FileDown className="size-4" />
											Download Resume PDF
										</a>
										{publicResumePdfHref ? (
											<a
												href={publicResumePdfHref}
												target="_blank"
												rel="noopener noreferrer"
												className={cn(
													buttonVariants({
														variant: "outline",
													}),
													"w-full justify-start",
												)}
											>
												<ExternalLink className="size-4" />
												Public Resume PDF
											</a>
										) : null}
									</div>
								</div>

								<div className="mt-auto flex items-center justify-between gap-3 pt-2">
									<Button
										type="button"
										variant="ghost"
										className="justify-start px-0 text-destructive hover:text-destructive"
										onClick={() => logoutMutation.mutate()}
										disabled={logoutMutation.isPending}
									>
										<LogOut className="size-4" />
										{logoutMutation.isPending
											? "Logging out..."
											: "Log out"}
									</Button>
									<ThemeToggleButton />
								</div>
							</>
						) : (
							<div className="mt-auto space-y-3 pt-2">
								<div className="flex flex-col gap-2">
									<Link
										to="/login"
										className={buttonVariants({
											variant: "outline",
										})}
									>
										Log in
									</Link>
									<Link
										to="/signup"
										className={buttonVariants({
											size: "default",
										})}
									>
										Create account
									</Link>
								</div>
								<div className="flex justify-end">
									<ThemeToggleButton />
								</div>
							</div>
						)}
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
