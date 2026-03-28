import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Response } from "express";

const COOKIE_NAME = "dpb_session";
const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
	userId: number;
	email: string;
	username: string;
	fullName: string;
};

const getJwtSecret = () => {
	const secret = process.env.JWT_SECRET;

	if (!secret) {
		throw new Error("JWT_SECRET is not defined");
	}

	return secret;
};

export const hashPassword = async (password: string) => bcrypt.hash(password, 10);

export const comparePassword = async (password: string, hash: string) =>
	bcrypt.compare(password, hash);

export const signSessionToken = (payload: SessionPayload) =>
	jwt.sign(payload, getJwtSecret(), { expiresIn: ONE_WEEK_SECONDS });

export const verifySessionToken = (token: string) =>
	jwt.verify(token, getJwtSecret()) as SessionPayload;

export const setSessionCookie = (res: Response, token: string) => {
	res.cookie(COOKIE_NAME, token, {
		httpOnly: true,
		sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
		secure: process.env.NODE_ENV === "production",
		maxAge: ONE_WEEK_SECONDS * 1000,
		path: "/",
	});
};

export const clearSessionCookie = (res: Response) => {
	res.clearCookie(COOKIE_NAME, {
		httpOnly: true,
		sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
	});
};

export const SESSION_COOKIE_NAME = COOKIE_NAME;
