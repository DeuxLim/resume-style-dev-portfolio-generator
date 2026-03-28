import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

const getPoolConfig = () => {
	if (process.env.DATABASE_URL) {
		return {
			uri: process.env.DATABASE_URL,
			connectionLimit: 10,
		};
	}

	return {
		host: process.env.DB_HOST ?? "127.0.0.1",
		port: Number(process.env.DB_PORT ?? 3306),
		user: process.env.DB_USER ?? "root",
		password: process.env.DB_PASSWORD ?? "",
		database: process.env.DB_NAME ?? "dev_portfolio_builder",
		connectionLimit: 10,
	};
};

export const getDb = () => {
	if (!pool) {
		if (process.env.DATABASE_URL) {
			pool = mysql.createPool(process.env.DATABASE_URL);
		} else {
			pool = mysql.createPool(getPoolConfig());
		}
	}

	return pool;
};
