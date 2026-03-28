import { RouterProvider } from "react-router";
import ThemeProvider from "@/context/Theme/ThemeProvider";
import routes from "@/routes";

function App() {
	return (
		<ThemeProvider>
			<RouterProvider router={routes} />
		</ThemeProvider>
	);
}

export default App;
