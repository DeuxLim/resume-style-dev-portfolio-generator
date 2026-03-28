import type { NextFunction, Request, Response } from "express";
import {
	SESSION_COOKIE_NAME,
	clearSessionCookie,
	verifySessionToken,
} from "../lib/auth.js";

declare global {
	namespace Express {
		interface Request {
			auth?: {
				userId: number;
				email: string;
				username: string;
				fullName: string;
			};
		}
	}
}

export const requireAuth = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const token = req.cookies?.[SESSION_COOKIE_NAME];

	if (!token) {
		res.status(401).json({ message: "Unauthorized" });
		return;
	}

	try {
		req.auth = verifySessionToken(token);
		next();
	} catch {
		clearSessionCookie(res);
		res.status(401).json({ message: "Unauthorized" });
	}
};

export const attachAuthIfPresent = (
	req: Request,
	_res: Response,
	next: NextFunction,
) => {
	const token = req.cookies?.[SESSION_COOKIE_NAME];

	if (!token) {
		next();
		return;
	}

	try {
		req.auth = verifySessionToken(token);
	} catch {
		delete req.auth;
	}

	next();
};
