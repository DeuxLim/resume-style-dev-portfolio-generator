# Dev Portfolio Builder

This project is a multi-user developer portfolio builder built with:

- `React + TypeScript + Vite`
- `Express + TypeScript`
- `MySQL`
- `Gemini API`

Users can:

- create an account
- log in to a dashboard
- edit their portfolio content
- enable or disable portfolio chat
- use the app-level Gemini key or save their own key
- get a public portfolio URL at `/:username`

## Local Setup

### 1. Requirements

Make sure you have these installed:

- `Node.js 20+`
- `npm`
- `MySQL 8+`

### 2. Install dependencies

From the project root:

```bash
npm install
```

### 3. Create environment file

Copy the example env file:

```bash
cp .env.example .env
```

Then update the values in `.env`.

Minimum values you should set:

```env
VITE_API_BASE_URL=http://localhost:3000/api
CLIENT_URL=http://localhost:5173
JWT_SECRET=replace-this-with-a-long-random-secret
GEMINI_API_KEY=your-gemini-api-key
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_NAME=dev_portfolio_builder
```

Notes:

- `GEMINI_API_KEY` is the default key used by portfolio chat.
- If a user saves their own Gemini key in the dashboard, that key is used for their portfolio instead.
- You can use `DATABASE_URL` instead of the individual `DB_*` values if you prefer.

### 4. Create the database

Log in to MySQL and create the database:

```sql
CREATE DATABASE dev_portfolio_builder;
```

Then run the schema in [schema.sql](/Users/deuxlim/WebDevelopment/Projects/DevPortfolioGenerator/server/database/schema.sql).

Example:

```bash
mysql -u root -p dev_portfolio_builder < server/database/schema.sql
```

### 5. Start the app

From the project root:

```bash
npm run dev
```

This starts:

- frontend on `http://localhost:5173`
- backend on `http://localhost:3000`

## Local Usage Flow

### 1. Open the landing page

Visit:

```txt
http://localhost:5173
```

### 2. Create an account

Use the signup page to create a developer account.

Required fields:

- full name
- username
- email
- password

Your username becomes your public portfolio URL:

```txt
http://localhost:5173/your-username
```

### 3. Edit your portfolio

After signup or login, go to:

```txt
http://localhost:5173/dashboard
```

From there you can edit:

- basic profile info
- about section
- timeline
- experience
- tech stack
- projects
- custom sections
- Gemini chat settings

### 4. View your public portfolio

Open your public route:

```txt
http://localhost:5173/your-username
```

## Important Files

- App routes: [routes.tsx](/Users/deuxlim/WebDevelopment/Projects/DevPortfolioGenerator/client/src/routes.tsx)
- Dashboard page: [DashboardPage.tsx](/Users/deuxlim/WebDevelopment/Projects/DevPortfolioGenerator/client/src/pages/DashboardPage.tsx)
- Public portfolio page: [PortfolioPage.tsx](/Users/deuxlim/WebDevelopment/Projects/DevPortfolioGenerator/client/src/pages/PortfolioPage.tsx)
- Shared portfolio UI: [PortfolioView.tsx](/Users/deuxlim/WebDevelopment/Projects/DevPortfolioGenerator/client/src/components/portfolio/PortfolioView.tsx)
- Auth API: [auth.controller.ts](/Users/deuxlim/WebDevelopment/Projects/DevPortfolioGenerator/server/controllers/auth.controller.ts)
- Portfolio API: [portfolio.controller.ts](/Users/deuxlim/WebDevelopment/Projects/DevPortfolioGenerator/server/controllers/portfolio.controller.ts)
- MySQL schema: [schema.sql](/Users/deuxlim/WebDevelopment/Projects/DevPortfolioGenerator/server/database/schema.sql)
- Env example: [.env.example](/Users/deuxlim/WebDevelopment/Projects/DevPortfolioGenerator/.env.example)

## API Overview

Main backend routes:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/portfolios/me`
- `PUT /api/portfolios/me`
- `GET /api/portfolios/:username`
- `POST /api/chat/send-message`

## Build Check

These commands were used to verify the project:

```bash
npm run build
npx tsc -p server/tsconfig.json --noEmit
```

## Vercel Notes

This repo already includes:

- [vercel.json](/Users/deuxlim/WebDevelopment/Projects/DevPortfolioGenerator/vercel.json)
- API entrypoint at [index.ts](/Users/deuxlim/WebDevelopment/Projects/DevPortfolioGenerator/api/index.ts)

For Vercel deployment, add the same env vars from `.env` into your Vercel project settings and make sure your MySQL database is reachable from Vercel.
