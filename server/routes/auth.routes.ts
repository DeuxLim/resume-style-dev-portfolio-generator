import { Router } from "express";
import AuthController from "../controllers/auth.controller.js";
import {
	attachAuthIfPresent,
	requireAuth,
} from "../middleware/auth.middleware.js";

const AuthRouter = Router();

AuthRouter.post("/signup", AuthController.signup);
AuthRouter.post("/login", AuthController.login);
AuthRouter.post("/logout", AuthController.logout);
AuthRouter.get("/session", attachAuthIfPresent, AuthController.getSession);
AuthRouter.get("/me", requireAuth, AuthController.getSession);

export default AuthRouter;
