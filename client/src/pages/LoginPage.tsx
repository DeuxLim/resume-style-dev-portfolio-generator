import { api } from "@/lib/axios.client";
import { sessionQueryKey } from "@/hooks/useSession";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

export default function LoginPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [form, setForm] = useState({ email: "", password: "" });
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
		<main className="max-w-xl mx-auto">
			<section className="app-card p-4 sm:p-6">
				<div className="space-y-2">
					<div className="text-xs uppercase tracking-[0.24em] text-(--app-subtle)">
						Welcome back
					</div>
					<h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
						Log in to your portfolio dashboard
					</h1>
					<p className="text-sm text-(--app-muted)">
						Manage your public developer page and update your content anytime.
					</p>
				</div>

				<div className="mt-6 space-y-4">
					<label className="block space-y-2">
						<span className="text-sm font-medium">Email</span>
						<input
							type="email"
							value={form.email}
							onChange={(event) =>
								setForm((current) => ({
									...current,
									email: event.target.value,
								}))
							}
							className="w-full h-11 px-3 bg-(--app-surface-2) border border-(--app-border)"
						/>
					</label>

					<label className="block space-y-2">
						<span className="text-sm font-medium">Password</span>
						<input
							type="password"
							value={form.password}
							onChange={(event) =>
								setForm((current) => ({
									...current,
									password: event.target.value,
								}))
							}
							className="w-full h-11 px-3 bg-(--app-surface-2) border border-(--app-border)"
						/>
					</label>

					{error && <div className="text-sm text-red-500">{error}</div>}

					<button
						type="button"
						onClick={() => {
							setError("");
							loginMutation.mutate();
						}}
						disabled={loginMutation.isPending}
						className="app-chip px-4 py-2 font-medium disabled:opacity-60"
					>
						{loginMutation.isPending ? "Logging in..." : "Log in"}
					</button>

					<div className="text-sm text-(--app-muted)">
						No account yet? <Link to="/signup" className="underline">Create one</Link>
					</div>
				</div>
			</section>
		</main>
	);
}
