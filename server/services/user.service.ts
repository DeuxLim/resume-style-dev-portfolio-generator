import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getDb } from "../lib/db.js";
import { comparePassword, hashPassword } from "../lib/auth.js";
import type { SessionUser } from "../../shared/types/portfolio.types.js";

type UserRow = RowDataPacket & {
	id: number;
	email: string;
	username: string;
	full_name: string;
	password_hash: string;
};

export const getUserByEmail = async (email: string) => {
	const db = getDb();
	const [rows] = await db.query<UserRow[]>(
		"SELECT id, email, username, full_name, password_hash FROM users WHERE email = ? LIMIT 1",
		[email],
	);

	return rows[0] ?? null;
};

export const getUserByUsername = async (username: string) => {
	const db = getDb();
	const [rows] = await db.query<UserRow[]>(
		"SELECT id, email, username, full_name, password_hash FROM users WHERE username = ? LIMIT 1",
		[username],
	);

	return rows[0] ?? null;
};

export const createUser = async (input: {
	email: string;
	username: string;
	fullName: string;
	password: string;
}): Promise<SessionUser> => {
	const db = getDb();
	const passwordHash = await hashPassword(input.password);

	const [result] = await db.query<ResultSetHeader>(
		`
			INSERT INTO users (email, username, full_name, password_hash)
			VALUES (?, ?, ?, ?)
		`,
		[input.email, input.username, input.fullName, passwordHash],
	);

	return {
		id: result.insertId,
		email: input.email,
		username: input.username,
		fullName: input.fullName,
	};
};

export const authenticateUser = async (input: {
	email: string;
	password: string;
}): Promise<SessionUser | null> => {
	const user = await getUserByEmail(input.email);

	if (!user) {
		return null;
	}

	const matches = await comparePassword(input.password, user.password_hash);

	if (!matches) {
		return null;
	}

	return {
		id: user.id,
		email: user.email,
		username: user.username,
		fullName: user.full_name,
	};
};
