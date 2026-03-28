// ============================================================
// VERSION 1 — Liquid Glass (iOS-style)
// Real glass feel: refraction shimmer, subtle distortion,
// specular highlight on top edge, deep blur, soft shadow
// ============================================================

export default function LiquidGlass({
	children,
}: {
	children?: React.ReactNode;
}) {
	return (
		<div className="relative max-w-4xl mx-auto px-4 py-6 md:py-8">
			{/* The glass surface */}
			<div
				className="relative rounded-none overflow-hidden"
				style={{
					background: "var(--app-glass-bg)",
					/* Deep blur = glass thickness illusion */
					backdropFilter:
						"blur(28px) saturate(180%) brightness(1.05)",
					WebkitBackdropFilter:
						"blur(28px) saturate(180%) brightness(1.05)",
					boxShadow: "var(--app-glass-shadow)",
				}}
			>
				{/* Specular highlight — the "top glint" iOS glass has */}
				<div
					className="absolute top-0 left-0 right-0 h-px"
					style={{
						background: "var(--app-glass-glint)",
					}}
				/>

				{/* Subtle inner refraction gradient sweep */}
				<div
					className="absolute inset-0 pointer-events-none"
					style={{
						background: "var(--app-glass-refract)",
					}}
				/>

				{/* Actual content sits above all effects */}
				<div className="relative z-10">
					{/* Content */}
					{children}
				</div>
			</div>
		</div>
	);
}
