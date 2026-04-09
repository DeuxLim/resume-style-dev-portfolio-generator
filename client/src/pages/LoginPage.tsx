import { api } from "@/lib/axios.client";
import { sessionQueryKey } from "@/hooks/useSession";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";

export default function LoginPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [form, setForm] = useState({ email: "", password: "" });
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState("");

	const loginMutation = useMutation({
		mutationFn: async () => {
			const { data } = await api.post("/auth/login", form);
			return data;
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
			navigate("/dashboard");
		},
		onError: () => setError("Invalid email or password."),
	});

	return (
		<main className="mx-auto w-full max-w-5xl">
			<section className="v2-shell-header v2-top-nav-glass overflow-hidden rounded-[2rem]">
				<div className="grid grid-cols-1 md:grid-cols-[0.92fr_1.08fr]">
					<div className="relative overflow-hidden border-b border-border/50 bg-gradient-to-br from-muted/55 via-muted/20 to-transparent p-7 md:border-r md:border-b-0 md:p-10">
						<div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/45 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-muted-foreground">
							<Sparkles className="size-3.5" />
							PROFILE BUILDER
						</div>
						<h2 className="mt-5 text-2xl font-semibold leading-tight sm:text-3xl">
							Welcome back
						</h2>
						<p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
							Open your workspace and continue refining your portfolio and resume.
						</p>
					</div>

					<div className="p-7 sm:p-10">
						<div className="mx-auto w-full max-w-md space-y-6">
					<div>
						<h1 className="text-3xl leading-tight sm:text-4xl">Log in to Profile Builder</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							Access your dashboard and continue editing your profile and resume.
						</p>
					</div>

					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								className="bg-background/55"
								value={form.email}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										email: event.target.value,
									}))
								}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<div className="relative">
								<Input
									id="password"
									type={showPassword ? "text" : "password"}
									placeholder="Enter your password"
									value={form.password}
									className="bg-background/55 pr-10"
									onChange={(event) =>
										setForm((current) => ({
											...current,
											password: event.target.value,
										}))
									}
								/>
								<button
									type="button"
									aria-label={showPassword ? "Hide password" : "Show password"}
									className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
									onClick={() => setShowPassword((current) => !current)}
								>
									{showPassword ? (
										<EyeOff className="size-4" />
									) : (
										<Eye className="size-4" />
									)}
								</button>
							</div>
						</div>
					</div>

					{error ? (
						<div className="rounded-2xl border border-destructive/35 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
							{error}
						</div>
					) : null}

					<Button
						type="button"
						onClick={() => {
							setError("");
							loginMutation.mutate();
						}}
						disabled={loginMutation.isPending}
						className="w-full"
						size="lg"
					>
						{loginMutation.isPending ? "Logging in..." : "Log in"}
						<ArrowRight className="size-4" />
					</Button>

					<p className="text-sm text-muted-foreground">
						No account yet?{" "}
						<Link to="/signup" className="font-medium text-foreground underline underline-offset-4">
							Create one
						</Link>
					</p>
				</div>
					</div>
				</div>
			</section>
		</main>
	);
}
