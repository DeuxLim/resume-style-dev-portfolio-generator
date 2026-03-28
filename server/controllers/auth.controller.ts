import type { Request, Response } from "express";
import {
	clearSessionCookie,
	type SessionPayload,
	setSessionCookie,
	signSessionToken,
} from "../lib/auth.js";
import {
	createStarterPortfolio,
	getEditablePortfolioByUserId,
} from "../services/portfolio.service.js";
import {
	authenticateUser,
	createUser,
	getUserByEmail,
	getUserByUsername,
} from "../services/user.service.js";

const sanitizeUser = (user: {
	id: number;
	email: string;
	username: string;
	fullName: string;
}) => user;

const toSessionPayload = (user: {
	id: number;
	email: string;
	username: string;
	fullName: string;
}): SessionPayload => ({
	userId: user.id,
	email: user.email,
	username: user.username,
	fullName: user.fullName,
});

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeUsername = (username: string) =>
	username
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, "")
		.slice(0, 40);

const signup = async (req: Request, res: Response) => {
	const email = normalizeEmail(req.body.email ?? "");
	const username = normalizeUsername(req.body.username ?? "");
	const fullName = String(req.body.fullName ?? "").trim();
	const password = String(req.body.password ?? "");

	if (!email || !username || !fullName || password.length < 8) {
		res.status(400).json({
			message:
				"Full name, username, email, and a password with at least 8 characters are required.",
		});
		return;
	}

	if (await getUserByEmail(email)) {
		res.status(409).json({ message: "Email is already in use." });
		return;
	}

	if (await getUserByUsername(username)) {
		res.status(409).json({ message: "Username is already taken." });
		return;
	}

	const user = await createUser({ email, username, fullName, password });
	await createStarterPortfolio(user);

	const token = signSessionToken(toSessionPayload(user));
	setSessionCookie(res, token);

	res.status(201).json({ user: sanitizeUser(user) });
};

const login = async (req: Request, res: Response) => {
	const email = normalizeEmail(req.body.email ?? "");
	const password = String(req.body.password ?? "");
	const user = await authenticateUser({ email, password });

	if (!user) {
		res.status(401).json({ message: "Invalid email or password." });
		return;
	}

	const token = signSessionToken(toSessionPayload(user));
	setSessionCookie(res, token);

	res.json({ user: sanitizeUser(user) });
};

const logout = async (_req: Request, res: Response) => {
	clearSessionCookie(res);
	res.status(204).end();
};

const getSession = async (req: Request, res: Response) => {
	if (!req.auth) {
		res.json({ user: null });
		return;
	}

	const portfolio = await getEditablePortfolioByUserId(req.auth.userId);

	res.json({
		user: {
			id: req.auth.userId,
			email: req.auth.email,
			username: req.auth.username,
			fullName: req.auth.fullName,
		},
		portfolioSlug: portfolio?.username ?? req.auth.username,
	});
};

const AuthController = { signup, login, logout, getSession };
export default AuthController;
