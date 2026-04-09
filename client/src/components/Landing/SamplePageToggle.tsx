import { Link } from "react-router";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SamplePageToggleProps = {
	active: "portfolio" | "resume";
};

export default function SamplePageToggle({ active }: SamplePageToggleProps) {
	return (
		<div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 p-1">
			<Link
				to="/sample"
				className={cn(
					buttonVariants({
						size: "sm",
						variant: active === "portfolio" ? "default" : "ghost",
						className: "rounded-lg",
					}),
				)}
			>
				Portfolio sample
			</Link>
			<Link
				to="/sample/resume"
				className={cn(
					buttonVariants({
						size: "sm",
						variant: active === "resume" ? "default" : "ghost",
						className: "rounded-lg",
					}),
				)}
			>
				Resume sample
			</Link>
		</div>
	);
}
