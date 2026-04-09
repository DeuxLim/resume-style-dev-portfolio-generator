import { api } from "@/lib/axios.client";
import { sessionQueryKey } from "@/hooks/useSession";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";

export default function SignupPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [form, setForm] = useState({
		fullName: "",
		username: "",
		email: "",
		password: "",
	});
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState("");

	const signupMutation = useMutation({
		mutationFn: async () => {
			const { data } = await api.post("/auth/signup", form);
			return data;
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
			navigate("/dashboard");
		},
		onError: (error: unknown) => {
			if (
				typeof error === "object" &&
				error !== null &&
				"response" in error &&
				typeof error.response === "object" &&
				error.response !== null &&
				"data" in error.response &&
				typeof error.response.data === "object" &&
				error.response.data !== null &&
				"message" in error.response.data
			) {
				setError(String(error.response.data.message));
				return;
			}

			setError("Unable to create account.");
		},
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
							Build your workspace
						</h2>
						<p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
							Create an account to start customizing your portfolio and generating resume versions.
						</p>
					</div>

					<div className="p-7 sm:p-10">
						<div className="mx-auto w-full max-w-xl space-y-6">
					<div>
						<h1 className="text-3xl leading-tight sm:text-4xl">Create your account</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							Start your Profile Builder workspace. You can edit everything later.
						</p>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="fullName">Full name</Label>
							<Input
								id="fullName"
								type="text"
								placeholder="Maria Angela Santos"
								className="bg-background/55"
								value={form.fullName}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										fullName: event.target.value,
									}))
								}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="username">Username</Label>
							<Input
								id="username"
								type="text"
								placeholder="maria-santos-dev"
								className="bg-background/55"
								value={form.username}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										username: event.target.value,
									}))
								}
							/>
						</div>
					</div>

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
								placeholder="At least 8 characters"
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

					{error ? (
						<div className="rounded-2xl border border-destructive/35 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
							{error}
						</div>
					) : null}

					<Button
						type="button"
						onClick={() => {
							setError("");
							signupMutation.mutate();
						}}
						disabled={signupMutation.isPending}
						className="w-full"
						size="lg"
					>
						{signupMutation.isPending ? "Creating..." : "Create account"}
						<ArrowRight className="size-4" />
					</Button>

					<p className="text-sm text-muted-foreground">
						Already have an account?{" "}
						<Link to="/login" className="font-medium text-foreground underline underline-offset-4">
							Log in
						</Link>
					</p>
				</div>
					</div>
				</div>
			</section>
		</main>
	);
}
