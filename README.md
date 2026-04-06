# Dev Portfolio Generator

Multi-user portfolio and resume platform with public profile pages, versioned portfolio editing, ATS-oriented resume editing, PDF export, and optional AI chat per portfolio.

## Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS v4, React Query
- Backend: Express 5, TypeScript
- Database: MySQL (JSON columns for structured content)
- AI: Google Gemini via `@google/genai`
- Auth: JWT in httpOnly cookie (`dpb_session`)

## Core Features

- Account signup/login/logout with session cookie auth
- Public portfolio page at `/:username` (or custom slug)
- Portfolio editor with:
  - profile/story/career/stack/layout/extras tabs
  - avatar/cover upload or URL mode
  - markdown about section
  - tech category presets + manual tagging
  - custom sections (text, bullets, links)
  - AI chat toggle + optional per-user Gemini key
- Portfolio versioning:
  - create draft versions from `latest`, `live`, or `blank`
  - rename/delete drafts
  - activate any draft as live
  - duplicate snapshot prevention
- Dashboard management:
  - live public URL controls
  - quick copy/open actions
  - version timeline
  - resume summary cards
- Resume builder:
  - structured section editing
  - layout order/visibility controls
  - validation warnings/errors
  - PDF preview/download
  - ATS/Harvard templates
  - optional sync resume -> portfolio
- Public resume PDF endpoint by portfolio slug

## Documentation Index

- User manual and onboarding: [`docs/user-guide.md`](./docs/user-guide.md)
- Developer architecture and interview prep: [`docs/developer-architecture-guide.md`](./docs/developer-architecture-guide.md)

## Local Setup

### 1. Requirements

- Node.js 20+
- npm
- MySQL 8+

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Minimum variables:

```env
VITE_API_BASE_URL=http://localhost:3000/api
CLIENT_URL=http://localhost:5173
JWT_SECRET=replace-with-long-random-secret
GEMINI_API_KEY=your-gemini-api-key
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=dev_portfolio_builder
```

Notes:

- `DATABASE_URL` is supported as an alternative to individual `DB_*` values.
- SSL options are supported with `DB_SSL`, `DB_SSL_CA`, and `DB_SSL_REJECT_UNAUTHORIZED`.

### 4. Create database and schema

```sql
CREATE DATABASE dev_portfolio_builder;
```

```bash
mysql -u root -p dev_portfolio_builder < server/database/schema.sql
```

### 5. Run the app

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

Backend only:

```bash
npm run server
```

## API Overview

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/auth/me`

### Portfolio

- `GET /api/portfolios/me`
- `PUT /api/portfolios/me`
- `PUT /api/portfolios/me/slug`
- `POST /api/portfolios/me/avatar`
- `POST /api/portfolios/me/cover`
- `GET /api/portfolios/me/versions`
- `GET /api/portfolios/me/versions/preview?base=latest|live|blank`
- `GET /api/portfolios/me/versions/:versionId`
- `POST /api/portfolios/me/versions`
- `PUT /api/portfolios/me/versions/:versionId`
- `PUT /api/portfolios/me/versions/:versionId/snapshot`
- `PUT /api/portfolios/me/versions/:versionId/activate`
- `DELETE /api/portfolios/me/versions/:versionId`
- `GET /api/portfolios/:username`

### Resume

- `GET /api/resumes/me`
- `PUT /api/resumes/me`
- `GET /api/resumes/me/pdf`
- `POST /api/resumes/me/sync-portfolio`
- `GET /api/resumes/:username/pdf`

### Chat

- `POST /api/chat/send-message`

### Diagnostics

- `GET /api/health`
- `GET /api/routes`

## Build / Checks

```bash
npm run build
npx tsc -p server/tsconfig.json --noEmit
```

## Key Files

- Routes: `client/src/routes.tsx`, `server/routes/routes.ts`
- Portfolio editor: `client/src/pages/PortfolioEditorPage.tsx`
- Resume builder: `client/src/pages/ResumeBuilderPage.tsx`
- Dashboard: `client/src/pages/DashboardPage.tsx`
- Public portfolio page: `client/src/pages/PortfolioPage.tsx`
- Auth logic: `server/controllers/auth.controller.ts`, `server/lib/auth.ts`
- Portfolio service and versioning: `server/services/portfolio.service.ts`
- Resume service and PDF generation: `server/services/resume.service.ts`, `server/lib/resume.ts`
- AI chat service: `server/controllers/chat.controller.ts`, `server/services/gemini.service.ts`
- Schema: `server/database/schema.sql`

## Deployment Notes (Vercel)

- API entrypoint: `api/index.ts`
- Config: `vercel.json`
- Set the same env vars from `.env` in Vercel project settings.
- Ensure MySQL is network-accessible from Vercel runtime.
