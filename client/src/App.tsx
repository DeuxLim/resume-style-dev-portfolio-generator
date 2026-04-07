import { RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ThemeProvider from "@/context/Theme/ThemeProvider";
import routes from "@/routes";

const queryClient = new QueryClient();

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ThemeProvider>
				<RouterProvider router={routes} />
			</ThemeProvider>
		</QueryClientProvider>
	);
}

export default App;
