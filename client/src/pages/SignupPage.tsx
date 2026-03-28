import { api } from "@/lib/axios.client";
import { sessionQueryKey } from "@/hooks/useSession";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

export default function SignupPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [form, setForm] = useState({
		fullName: "",
		username: "",
		email: "",
		password: "",
	});
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
		<main className="max-w-xl mx-auto">
			<section className="app-card p-4 sm:p-6">
				<div className="space-y-2">
					<div className="text-xs uppercase tracking-[0.24em] text-(--app-subtle)">
						Create account
					</div>
					<h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
						Start your own developer portfolio
					</h1>
					<p className="text-sm text-(--app-muted)">
						Your username becomes your public portfolio URL.
					</p>
				</div>

				<div className="mt-6 grid gap-4">
					<label className="block space-y-2">
						<span className="text-sm font-medium">Full name</span>
						<input
							type="text"
							value={form.fullName}
							onChange={(event) =>
								setForm((current) => ({
									...current,
									fullName: event.target.value,
								}))
							}
							className="w-full h-11 px-3 bg-(--app-surface-2) border border-(--app-border)"
						/>
					</label>

					<label className="block space-y-2">
						<span className="text-sm font-medium">Username</span>
						<input
							type="text"
							value={form.username}
							onChange={(event) =>
								setForm((current) => ({
									...current,
									username: event.target.value,
								}))
							}
							className="w-full h-11 px-3 bg-(--app-surface-2) border border-(--app-border)"
						/>
					</label>

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
							signupMutation.mutate();
						}}
						disabled={signupMutation.isPending}
						className="app-chip px-4 py-2 font-medium disabled:opacity-60"
					>
						{signupMutation.isPending ? "Creating..." : "Create account"}
					</button>

					<div className="text-sm text-(--app-muted)">
						Already have an account?{" "}
						<Link to="/login" className="underline">
							Log in
						</Link>
					</div>
				</div>
			</section>
		</main>
	);
}
