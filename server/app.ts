import express from "express";
import "dotenv/config";
import cors from "cors";
import { corsOptions } from "./config/cors.js";
import registerRoutes from "./routes/routes.js";

const app = express();
const port = 3000;

/* Middlewares */
app.use(cors(corsOptions));

app.use(express.json());

registerRoutes(app);

app.listen(port, () => {
	console.log(`DeuxDevPortfolio listening on port ${port}`);
});
