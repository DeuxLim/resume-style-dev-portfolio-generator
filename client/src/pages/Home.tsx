import Content from "@/components/Home/Content";
import Header from "@/components/Home/Header";

export default function Home() {
	return (
		<main className="flex flex-col gap-3 sm:gap-4">
			<Header />
			<Content />
		</main>
	);
}
