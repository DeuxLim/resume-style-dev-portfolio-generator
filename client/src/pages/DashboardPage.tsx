import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios.client";
import { sessionQueryKey, useSession } from "@/hooks/useSession";
import {
	cloneEditablePortfolio,
	createCustomSection,
	createExperienceItem,
	createProjectItem,
	createTechCategory,
	createTimelineItem,
} from "@/lib/portfolio";
import type { EditablePortfolio } from "../../../shared/types/portfolio.types";

export default function DashboardPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const sessionQuery = useSession();
	const [portfolio, setPortfolio] = useState<EditablePortfolio | null>(null);
	const [statusMessage, setStatusMessage] = useState("");

	const portfolioQuery = useQuery({
		queryKey: ["my-portfolio"],
		queryFn: async () => {
			const { data } = await api.get<{ portfolio: EditablePortfolio }>(
				"/portfolios/me",
			);
			return data.portfolio;
		},
		enabled: Boolean(sessionQuery.data?.user),
	});

	useEffect(() => {
		if (sessionQuery.isSuccess && !sessionQuery.data?.user) {
			navigate("/login");
		}
	}, [navigate, sessionQuery.data, sessionQuery.isSuccess]);

	useEffect(() => {
		if (portfolioQuery.data) {
			setPortfolio(cloneEditablePortfolio(portfolioQuery.data));
		}
	}, [portfolioQuery.data]);

	const saveMutation = useMutation({
		mutationFn: async () => {
			const { data } = await api.put("/portfolios/me", { portfolio });
			return data;
		},
		onSuccess: async (data) => {
			setStatusMessage("Portfolio saved.");
			setPortfolio(cloneEditablePortfolio(data.portfolio));
			await queryClient.invalidateQueries({ queryKey: ["my-portfolio"] });
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
		},
	});

	const logoutMutation = useMutation({
		mutationFn: async () => api.post("/auth/logout"),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
			navigate("/");
		},
	});

	if (sessionQuery.isLoading || portfolioQuery.isLoading) {
		return <div className="app-card p-6">Loading dashboard...</div>;
	}

	if (!portfolio) {
		return null;
	}

	return (
		<main className="space-y-4">
			<section className="app-card p-4 sm:p-6">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
					<div>
						<div className="text-xs uppercase tracking-[0.24em] text-(--app-subtle)">
							Dashboard
						</div>
						<h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
							Edit your developer portfolio
						</h1>
						<p className="text-sm text-(--app-muted)">
							Public URL:{" "}
							<Link to={`/${portfolio.username}`} className="underline">
								/{portfolio.username}
							</Link>
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Link to={`/${portfolio.username}`} className="app-chip px-4 py-2">
							Preview
						</Link>
						<button
							type="button"
							onClick={() => logoutMutation.mutate()}
							className="app-chip px-4 py-2"
						>
							Log out
						</button>
						<button
							type="button"
							onClick={() => saveMutation.mutate()}
							className="app-chip px-4 py-2 font-medium"
						>
							{saveMutation.isPending ? "Saving..." : "Save changes"}
						</button>
					</div>
				</div>
				{statusMessage && (
					<div className="mt-4 text-sm text-emerald-600">{statusMessage}</div>
				)}
			</section>

			<section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<div className="app-card p-4 space-y-3">
					<div className="text-base sm:text-lg font-bold">Basic info</div>
					{[
						["fullName", "Full name"],
						["headline", "Headline"],
						["location", "Location"],
						["experienceSummary", "Experience summary"],
						["education", "Education"],
						["availability", "Availability"],
						["phone", "Phone"],
						["avatarUrl", "Avatar image URL"],
						["coverUrl", "Cover image URL"],
						["githubUrl", "GitHub URL"],
						["githubUsername", "GitHub username"],
						["linkedinUrl", "LinkedIn URL"],
					].map(([key, label]) => (
						<label key={key} className="block space-y-1">
							<span className="text-sm font-medium">{label}</span>
							<input
								type="text"
								value={String(portfolio[key as keyof EditablePortfolio] ?? "")}
								onChange={(event) =>
									setPortfolio((current) =>
										current
											? ({
													...current,
													[key]: event.target.value,
												} as EditablePortfolio)
											: current,
									)
								}
								className="w-full h-11 px-3 bg-(--app-surface-2) border border-(--app-border)"
							/>
						</label>
					))}
				</div>

				<div className="app-card p-4 space-y-3">
					<div className="text-base sm:text-lg font-bold">About</div>
					{portfolio.about.map((paragraph, index) => (
						<div key={index} className="space-y-2">
							<textarea
								value={paragraph}
								onChange={(event) =>
									setPortfolio((current) => {
										if (!current) return current;
										const next = [...current.about];
										next[index] = event.target.value;
										return { ...current, about: next };
									})
								}
								rows={4}
								className="w-full px-3 py-2 bg-(--app-surface-2) border border-(--app-border)"
							/>
							<button
								type="button"
								onClick={() =>
									setPortfolio((current) =>
										current
											? {
													...current,
													about: current.about.filter(
														(_, itemIndex) => itemIndex !== index,
													),
												}
											: current,
									)
								}
								className="text-sm text-(--app-muted)"
							>
								Remove paragraph
							</button>
						</div>
					))}
					<button
						type="button"
						onClick={() =>
							setPortfolio((current) =>
								current
									? { ...current, about: [...current.about, ""] }
									: current,
							)
						}
						className="app-chip px-3 py-2"
					>
						Add paragraph
					</button>
				</div>
			</section>

			<section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<div className="app-card p-4 space-y-4">
					<div className="flex items-center justify-between">
						<div className="text-base sm:text-lg font-bold">Timeline</div>
						<button
							type="button"
							onClick={() =>
								setPortfolio((current) =>
									current
										? {
												...current,
												timeline: [...current.timeline, createTimelineItem()],
											}
										: current,
								)
							}
							className="app-chip px-3 py-2"
						>
							Add item
						</button>
					</div>
					{portfolio.timeline.map((item) => (
						<div key={item.id} className="app-chip p-3 space-y-3">
							{(["year", "position", "company", "note"] as const).map((field) => (
								<input
									key={field}
									type="text"
									value={item[field]}
									onChange={(event) =>
										setPortfolio((current) =>
											current
												? {
														...current,
														timeline: current.timeline.map((entry) =>
															entry.id === item.id
																? { ...entry, [field]: event.target.value }
																: entry,
														),
													}
												: current,
										)
									}
									placeholder={field}
									className="w-full h-10 px-3 bg-(--app-surface) border border-(--app-border)"
								/>
							))}
							<button
								type="button"
								onClick={() =>
									setPortfolio((current) =>
										current
											? {
													...current,
													timeline: current.timeline.filter(
														(entry) => entry.id !== item.id,
													),
												}
											: current,
									)
								}
								className="text-sm text-(--app-muted)"
							>
								Remove item
							</button>
						</div>
					))}
				</div>

				<div className="app-card p-4 space-y-4">
					<div className="flex items-center justify-between">
						<div className="text-base sm:text-lg font-bold">Experience</div>
						<button
							type="button"
							onClick={() =>
								setPortfolio((current) =>
									current
										? {
												...current,
												experiences: [
													...current.experiences,
													createExperienceItem(),
												],
											}
										: current,
								)
							}
							className="app-chip px-3 py-2"
						>
							Add role
						</button>
					</div>
					{portfolio.experiences.map((item) => (
						<div key={item.id} className="app-chip p-3 space-y-3">
							{(["role", "company", "period"] as const).map((field) => (
								<input
									key={field}
									type="text"
									value={item[field]}
									onChange={(event) =>
										setPortfolio((current) =>
											current
												? {
														...current,
														experiences: current.experiences.map((entry) =>
															entry.id === item.id
																? { ...entry, [field]: event.target.value }
																: entry,
														),
													}
												: current,
										)
									}
									placeholder={field}
									className="w-full h-10 px-3 bg-(--app-surface) border border-(--app-border)"
								/>
							))}
							<textarea
								value={item.highlights.join("\n")}
								onChange={(event) =>
									setPortfolio((current) =>
										current
											? {
													...current,
													experiences: current.experiences.map((entry) =>
														entry.id === item.id
															? {
																	...entry,
																	highlights: event.target.value
																		.split("\n")
																		.map((value) => value.trim())
																		.filter(Boolean),
																}
															: entry,
													),
												}
											: current,
									)
								}
								rows={5}
								placeholder="One highlight per line"
								className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border)"
							/>
							<button
								type="button"
								onClick={() =>
									setPortfolio((current) =>
										current
											? {
													...current,
													experiences: current.experiences.filter(
														(entry) => entry.id !== item.id,
													),
												}
											: current,
									)
								}
								className="text-sm text-(--app-muted)"
							>
								Remove role
							</button>
						</div>
					))}
				</div>
			</section>

			<section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<div className="app-card p-4 space-y-4">
					<div className="flex items-center justify-between">
						<div className="text-base sm:text-lg font-bold">Tech stack</div>
						<button
							type="button"
							onClick={() =>
								setPortfolio((current) =>
									current
										? {
												...current,
												techCategories: [
													...current.techCategories,
													createTechCategory(),
												],
											}
										: current,
								)
							}
							className="app-chip px-3 py-2"
						>
							Add category
						</button>
					</div>
					{portfolio.techCategories.map((item) => (
						<div key={item.id} className="app-chip p-3 space-y-3">
							<input
								type="text"
								value={item.name}
								onChange={(event) =>
									setPortfolio((current) =>
										current
											? {
													...current,
													techCategories: current.techCategories.map((entry) =>
														entry.id === item.id
															? { ...entry, name: event.target.value }
															: entry,
													),
												}
											: current,
									)
								}
								placeholder="Category name"
								className="w-full h-10 px-3 bg-(--app-surface) border border-(--app-border)"
							/>
							<input
								type="text"
								value={item.items.join(", ")}
								onChange={(event) =>
									setPortfolio((current) =>
										current
											? {
													...current,
													techCategories: current.techCategories.map((entry) =>
														entry.id === item.id
															? {
																	...entry,
																	items: event.target.value
																		.split(",")
																		.map((value) => value.trim())
																		.filter(Boolean),
																}
															: entry,
													),
												}
											: current,
									)
								}
								placeholder="React, TypeScript, Tailwind"
								className="w-full h-10 px-3 bg-(--app-surface) border border-(--app-border)"
							/>
							<button
								type="button"
								onClick={() =>
									setPortfolio((current) =>
										current
											? {
													...current,
													techCategories: current.techCategories.filter(
														(entry) => entry.id !== item.id,
													),
												}
											: current,
									)
								}
								className="text-sm text-(--app-muted)"
							>
								Remove category
							</button>
						</div>
					))}
				</div>

				<div className="app-card p-4 space-y-4">
					<div className="flex items-center justify-between">
						<div className="text-base sm:text-lg font-bold">Projects</div>
						<button
							type="button"
							onClick={() =>
								setPortfolio((current) =>
									current
										? {
												...current,
												projects: [...current.projects, createProjectItem()],
											}
										: current,
								)
							}
							className="app-chip px-3 py-2"
						>
							Add project
						</button>
					</div>
					{portfolio.projects.map((item) => (
						<div key={item.id} className="app-chip p-3 space-y-3">
							{(["name", "description", "url"] as const).map((field) => (
								<input
									key={field}
									type="text"
									value={item[field]}
									onChange={(event) =>
										setPortfolio((current) =>
											current
												? {
														...current,
														projects: current.projects.map((entry) =>
															entry.id === item.id
																? { ...entry, [field]: event.target.value }
																: entry,
														),
													}
												: current,
										)
									}
									placeholder={field}
									className="w-full h-10 px-3 bg-(--app-surface) border border-(--app-border)"
								/>
							))}
							<button
								type="button"
								onClick={() =>
									setPortfolio((current) =>
										current
											? {
													...current,
													projects: current.projects.filter(
														(entry) => entry.id !== item.id,
													),
												}
											: current,
									)
								}
								className="text-sm text-(--app-muted)"
							>
								Remove project
							</button>
						</div>
					))}
				</div>
			</section>

			<section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<div className="app-card p-4 space-y-4">
					<div className="flex items-center justify-between">
						<div className="text-base sm:text-lg font-bold">Custom sections</div>
						<button
							type="button"
							onClick={() =>
								setPortfolio((current) =>
									current
										? {
												...current,
												customSections: [
													...current.customSections,
													createCustomSection(),
												],
											}
										: current,
								)
							}
							className="app-chip px-3 py-2"
						>
							Add section
						</button>
					</div>
					{portfolio.customSections.map((item) => (
						<div key={item.id} className="app-chip p-3 space-y-3">
							<input
								type="text"
								value={item.title}
								onChange={(event) =>
									setPortfolio((current) =>
										current
											? {
													...current,
													customSections: current.customSections.map((entry) =>
														entry.id === item.id
															? { ...entry, title: event.target.value }
															: entry,
													),
												}
											: current,
									)
								}
								placeholder="Section title"
								className="w-full h-10 px-3 bg-(--app-surface) border border-(--app-border)"
							/>
							<textarea
								value={item.body}
								onChange={(event) =>
									setPortfolio((current) =>
										current
											? {
													...current,
													customSections: current.customSections.map((entry) =>
														entry.id === item.id
															? { ...entry, body: event.target.value }
															: entry,
													),
												}
											: current,
									)
								}
								rows={5}
								className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border)"
							/>
							<button
								type="button"
								onClick={() =>
									setPortfolio((current) =>
										current
											? {
													...current,
													customSections: current.customSections.filter(
														(entry) => entry.id !== item.id,
													),
												}
											: current,
									)
								}
								className="text-sm text-(--app-muted)"
							>
								Remove section
							</button>
						</div>
					))}
				</div>

				<div className="app-card p-4 space-y-4">
					<div className="text-base sm:text-lg font-bold">AI settings</div>
					<label className="flex items-center gap-3">
						<input
							type="checkbox"
							checked={portfolio.chatEnabled}
							onChange={(event) =>
								setPortfolio((current) =>
									current
										? { ...current, chatEnabled: event.target.checked }
										: current,
								)
							}
						/>
						<span className="text-sm">Enable portfolio chat</span>
					</label>
					<label className="block space-y-2">
						<span className="text-sm font-medium">
							Optional Gemini API key
						</span>
						<input
							type="password"
							value={portfolio.geminiApiKey}
							onChange={(event) =>
								setPortfolio((current) =>
									current
										? {
												...current,
												geminiApiKey: event.target.value,
												hasCustomGeminiKey: Boolean(
													event.target.value.trim(),
												),
											}
										: current,
								)
							}
							className="w-full h-11 px-3 bg-(--app-surface-2) border border-(--app-border)"
						/>
						<p className="text-sm text-(--app-muted)">
							Leave this empty to use the app-level Gemini key configured on the
							server.
						</p>
					</label>
				</div>
			</section>
		</main>
	);
}
