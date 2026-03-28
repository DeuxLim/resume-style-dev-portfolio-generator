import { loadEnv } from "../server/config/env.js";
import createApp from "../server/createApp.js";

loadEnv();

const app = createApp();

export default app;
