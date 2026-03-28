import { loadEnv } from "./config/env.js";
import createApp from "./createApp.js";

loadEnv();

const port = 3000;
const app = createApp();

app.listen(port, () => {
	console.log(`DeuxDevPortfolio listening on port ${port}`);
});
