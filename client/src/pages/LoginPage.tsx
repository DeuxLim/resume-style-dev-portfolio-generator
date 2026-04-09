import { api } from "@/lib/axios.client";
import { sessionQueryKey } from "@/hooks/useSession";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

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
		<main className="mx-auto w-full max-w-xl overflow-hidden rounded-[2rem] border border-border/70 bg-background/82 shadow-[0_28px_80px_-58px_rgba(20,30,70,0.62)]">
			<section className="p-7 sm:p-10">
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
									className="pr-10"
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
			</section>
		</main>
	);
}
