import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

const shouldUseSsl = () =>
	process.env.DB_SSL === "true" ||
	Boolean(process.env.DATABASE_URL?.includes("aivencloud.com")) ||
	Boolean(process.env.DB_HOST?.includes("aivencloud.com"));

const shouldRejectUnauthorized = () =>
	process.env.DB_SSL_REJECT_UNAUTHORIZED === "true";

const getSslConfig = () => {
	if (!shouldUseSsl()) {
		return undefined;
	}

	const caRaw = process.env.DB_SSL_CA?.trim();
	const ca = caRaw ? caRaw.replace(/\\n/g, "\n") : undefined;

	return {
		rejectUnauthorized: ca ? true : shouldRejectUnauthorized(),
		...(ca ? { ca } : {}),
	};
};

const getPoolConfig = () => {
	if (process.env.DATABASE_URL) {
		return {
			uri: process.env.DATABASE_URL,
			ssl: getSslConfig(),
			connectionLimit: 10,
		};
	}

	return {
		host: process.env.DB_HOST ?? "127.0.0.1",
		port: Number(process.env.DB_PORT ?? 3306),
		user: process.env.DB_USER ?? "root",
		password: process.env.DB_PASSWORD ?? "",
		database: process.env.DB_NAME ?? "dev_portfolio_builder",
		ssl: getSslConfig(),
		connectionLimit: 10,
	};
};

export const getDb = () => {
	if (!pool) {
		pool = mysql.createPool(getPoolConfig());
	}

	return pool;
};
