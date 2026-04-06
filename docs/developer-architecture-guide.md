# Developer Guide: Architecture, Design, and Implementation

This document is for technical deep dives and interview prep.

## 1) System Architecture

### High-level topology

- `client/`: React SPA (Vite) for authenticated builder and public portfolio rendering
- `server/`: Express API for auth, portfolio CRUD/versioning, chat streaming, resume/PDF
- `shared/`: cross-layer types/defaults/validators used by both client and server
- `api/index.ts`: Vercel serverless entrypoint adapter for Express app
- `server/database/schema.sql`: relational schema with JSON content columns

### Data flow

1. Browser loads SPA from Vite/static host.
2. SPA calls API under `VITE_API_BASE_URL` (`/api` by default).
3. Authenticated routes rely on httpOnly session cookie.
4. API reads/writes MySQL.
5. Public portfolio route fetches by `public_slug`.
6. Chat endpoint builds portfolio-scoped prompt and streams Gemini output.
7. Resume PDF endpoints render server-side PDFKit output.

## 2) Key Design Decisions

### Shared contracts (`shared/`)

Shared TypeScript types are used in frontend + backend to keep payload contracts aligned:

- Portfolio domain: `shared/types/portfolio.types.ts`
- Resume domain: `shared/types/resume.types.ts`
- Defaults: `shared/defaults/*`
- Resume normalization/validation logic: `shared/lib/resume.ts`

Why this matters:

- Reduces DTO drift between UI forms and API storage
- Keeps validation and default behavior deterministic

### Portfolio content model in JSON columns

Portfolio and resume rich structures are persisted as JSON columns (about/timeline/experience/skills/custom sections/layout).

Benefits:

- Flexible nested content without excessive join tables
- Fast iteration on UI schema

Tradeoff:

- Less relational queryability for nested fields

### Versioned portfolio snapshots

`portfolio_versions.snapshot_json` stores immutable-like snapshots per version.

- Live portfolio remains in `portfolios`
- Active version is mirrored/synced
- Draft versions allow safe experimentation

This supports an editorial workflow similar to draft/publish systems.

### Session auth via signed JWT cookie

- Cookie name: `dpb_session`
- Signed with `JWT_SECRET`
- httpOnly always
- `sameSite`/`secure` switch by `NODE_ENV`

Reasoning:

- Simpler frontend auth (no manual token storage)
- Mitigates token exposure from JS context

### Optional per-user Gemini keys

Portfolio has `gemini_api_key` nullable field.

Resolution order:

1. User-specific key (if set)
2. Global `GEMINI_API_KEY`

This allows bring-your-own-key while preserving default app behavior.

## 3) Backend Implementation Breakdown

### App bootstrap

- `server/app.ts`: loads env and starts Express
- `server/createApp.ts`: configures middleware, static uploads, routes, and global error handling
- `server/config/env.ts`: supports `.env` lookup from multiple working directories

### Routing

Registered route groups in `server/routes/routes.ts`:

- `/api/auth`
- `/api/portfolios`
- `/api/resumes`
- `/api/chat`
- plus `/api/health` and `/api/routes`

### Auth

Files:

- `server/controllers/auth.controller.ts`
- `server/middleware/auth.middleware.ts`
- `server/lib/auth.ts`
- `server/services/user.service.ts`

Flow:

- Signup validates fields, normalizes email/username, hashes password (bcrypt)
- Login verifies hash and sets session cookie
- Protected routes use `requireAuth`
- Session endpoint exposes current user + effective portfolio slug

### Portfolio domain

Files:

- `server/controllers/portfolio.controller.ts`
- `server/services/portfolio.service.ts`
- `server/lib/portfolio.ts`

Important implementation details:

- Input sanitization for nested array/object payloads
- Header action normalization and max-size limits
- Layout constraints:
  - section spans only `4|6|8|12`
  - bounded section heights and positions
- Slug rules:
  - normalized lowercase-hyphen format
  - minimum length
  - reserved words blocked
  - unique index enforced
- Runtime schema hardening:
  - service ensures required columns/tables exist (`public_slug`, `layout_json`, `header_actions_json`, `portfolio_versions`)

Versioning mechanics:

- New users get starter portfolio + `Version 1` active snapshot
- Saving live portfolio updates active snapshot
- Draft version activation copies snapshot into live portfolio and marks active
- Deleting active version is blocked
- Creating duplicate snapshot version is blocked

### Media uploads

Files:

- `server/middleware/upload.middleware.ts`
- `server/lib/uploads.ts`

Behavior:

- Avatars: 3MB max
- Covers: 5MB max
- Allowed mime types: jpeg/png/webp/gif
- Stored under `server/uploads/{avatars|covers}` and served via `/uploads/*`
- Old uploaded files are best-effort cleaned when replaced

### Resume domain

Files:

- `server/controllers/resume.controller.ts`
- `server/services/resume.service.ts`
- `server/lib/resume.ts`
- `shared/lib/resume.ts`

Flow:

- `GET /resumes/me` creates starter resume on-demand if missing
- `PUT /resumes/me` normalizes + validates before persist
- Validation returns warnings/errors and estimated pages
- PDF export blocked on hard errors (`422`)
- PDF rendered via PDFKit with template-specific typography settings

Resume to portfolio sync:

- `POST /resumes/me/sync-portfolio`
- Maps normalized resume sections into portfolio model
- Resets portfolio layout defaults during mapping

### Chat domain

Files:

- `server/controllers/chat.controller.ts`
- `server/services/gemini.service.ts`

Flow:

1. Lookup portfolio by slug
2. Reject if not found or chat disabled
3. Build system prompt from portfolio content only
4. Call Gemini `generateContentStream`
5. Stream plain text chunks to client

## 4) Frontend Implementation Breakdown

### App shell

- `client/src/App.tsx`: QueryClient + ThemeProvider + RouterProvider
- `client/src/layouts/AppLayout.tsx`: top navigation, auth-aware actions, theme toggle

### Routing

`client/src/routes.tsx`:

- Public: `/`, `/login`, `/signup`, `/sample`, `/:username`
- Authenticated pages:
  - `/dashboard`
  - `/dashboard/edit`
  - `/dashboard/create`
  - `/dashboard/resume`

### Data fetching and session model

- Axios client sets `withCredentials: true`
- Session query from `/auth/session`
- React Query cache keys centralize state refresh after mutations

### Dashboard page

`client/src/pages/DashboardPage.tsx`

Responsibilities:

- Portfolio slug updates
- Version list actions (activate/rename/delete/create)
- Resume status summary and PDF links
- User-level launch point for builders

### Portfolio editor page

`client/src/pages/PortfolioEditorPage.tsx`

Responsibilities:

- Full editable portfolio state model
- Draft/live mode resolution from query params
- Optimistic UI-like local edits, explicit save mutation
- Image upload mutations
- Grid layout editing via `react-grid-layout`
- Quick preview modal + shortcuts

### Public portfolio page

`client/src/pages/PortfolioPage.tsx`

- Fetches public portfolio by slug
- Renders shared `PortfolioView`
- Conditionally mounts chat widget when `chatEnabled`

### Chat UI

Files:

- `client/src/components/Chatbot/*`
- `client/src/hooks/useChatStream.tsx`

Implementation:

- Client sends `newMessage + history`
- Stream reader appends model response incrementally
- Placeholder model message updated in place for typing effect

### Resume builder page

`client/src/pages/ResumeBuilderPage.tsx`

Responsibilities:

- Structured resume section editing
- Section visibility/reorder controls
- Real-time client-side validation mirror
- Save + preview + download actions
- Keyboard shortcuts

## 5) Database Schema Overview

Main tables:

- `users`: account identity + password hash
- `portfolios`: current live editable portfolio record per user
- `portfolio_versions`: named snapshots and active version tracking
- `resumes`: structured resume + layout per user

Important constraints:

- One portfolio per user (`portfolios.user_id` unique)
- One resume per user (`resumes.user_id` unique)
- Username/email uniqueness in `users`
- Public slug uniqueness in `portfolios`
- Cascade delete from user -> related records

## 6) API Contract Summary (Interview-ready)

### Auth

- Cookie-based auth, no bearer token requirement in SPA
- `GET /auth/session` used for app bootstrap state

### Portfolio

- Live record + version snapshots coexist
- `PUT /portfolios/me` writes live and syncs active snapshot
- Version routes provide draft management lifecycle

### Resume

- On-demand resume creation simplifies first-run UX
- Server is source of truth for PDF eligibility

### Chat

- Public endpoint but bounded to one portfolio slug context
- No generic assistant mode; prompt is portfolio-scoped

## 7) Reliability and Security Notes

Implemented:

- Password hashing (bcrypt)
- Signed JWT with expiration
- httpOnly session cookie
- CORS allowlist with credentials enabled
- Input normalization and bounded layout values
- Upload file type/size checks
- Global error handler with DB availability fallback responses

Known gaps to discuss transparently in interviews:

- No automated test suite committed yet
- No explicit rate limiting on auth/chat endpoints
- No CSRF token layer for cookie-auth state changes
- Gemini key is stored as plain DB string (not encrypted at rest)
- Limited observability/metrics instrumentation currently

## 8) Common Interview Questions You Can Answer

### “How does draft publishing work?”

- Drafts are stored in `portfolio_versions.snapshot_json`.
- Live portfolio stays in `portfolios`.
- Activation loads a snapshot, applies it to live portfolio, and flips active version.

### “How do you prevent bad layout payloads?”

- Server sanitizes `sectionOrder`, `sectionSpans`, `sectionHeights`, and `sectionPositions` with explicit bounds and allowed values before DB write.

### “How is resume PDF validity enforced?”

- Shared validation produces warnings/errors.
- Export endpoint blocks when hard errors exist (`canExportPdf === false`).

### “How does AI chat stay grounded?”

- Prompt is generated from portfolio fields and instructs the model to use only provided data and say when info is missing.

### “Why shared types?”

- They reduce contract drift, speed refactors, and keep frontend/backend payload shape synchronized.

## 9) Suggested Next Engineering Upgrades

1. Add integration tests for auth, versioning, resume validation, and chat endpoint behavior.
2. Add rate limiting + basic abuse controls on auth and chat endpoints.
3. Add CSRF protection for cookie-auth mutating routes.
4. Encrypt user Gemini keys at rest.
5. Add structured logging and request IDs for production debugging.
