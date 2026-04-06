# User Guide

This guide explains all user-facing features and how to onboard from zero to a live portfolio.

## What This App Does

You can create a developer account, build a public portfolio page, manage multiple portfolio versions, build a resume, export PDF, and optionally enable AI chat on your public profile.

Public URLs:

- Portfolio: `https://your-domain/<public-slug>`
- Resume PDF: `https://your-api-domain/api/resumes/<public-slug>/pdf`

## Account and Access

### Signup

Go to `/signup` and provide:

- Full name
- Username
- Email
- Password (minimum 8 characters)

After signup, the app:

- Creates your account
- Creates your starter portfolio
- Creates your first active portfolio version (`Version 1`)
- Logs you in (session cookie)

### Login / Session

- Login page: `/login`
- Session is stored in cookie `dpb_session`
- Dashboard routes require login

## Dashboard

Route: `/dashboard`

Main things you can do:

- See your live public URL
- Update your public URL slug
- Copy/open your public URL
- View version timeline
- Set a version as live
- Rename/delete non-live versions
- Open portfolio builder
- Open resume builder
- Preview/download resume PDF

## Portfolio Builder

Route: `/dashboard/edit` (live editor) or `/dashboard/edit?versionId=<id>` (draft version)

### Tabs and Features

- `Profile`
  - Basic fields (name, headline, location, summary, education, availability, contacts)
  - Avatar and cover input modes:
    - Upload image
    - Direct image URL
  - Header actions (up to 4): GitHub, LinkedIn, Email, Phone, or generic link
- `Story`
  - About section in Markdown (write + preview)
  - Timeline entries
- `Career`
  - Experience entries with highlight bullets
- `Stack`
  - Tech categories and items
  - Presets and searchable suggestions
- `Layout`
  - Drag-and-drop section layout canvas
  - Section span/height/position adjustments
  - Auto-fit and reset support
  - Custom section editor access
- `Extras`
  - AI chat toggle (`chatEnabled`)
  - Optional custom Gemini API key (`geminiApiKey`)

### Save Behavior

- `Ctrl/Cmd + S` saves
- When editing live portfolio, save updates live content immediately
- When editing a draft version, save updates only that version snapshot

### Preview Behavior

- `Ctrl/Cmd + Shift + P` opens quick preview modal
- Public page only reflects live version, not draft versions

## Portfolio Versioning

Managed from Dashboard and Builder.

### Create version

Create from base:

- `latest`: latest updated version snapshot
- `live`: currently public portfolio
- `blank`: clean starter fields

### Version operations

- Rename version
- Delete version (only if not active)
- Activate version (makes it public/live)

Rules:

- Active version cannot be deleted
- Duplicate snapshots are blocked on create

## Public Portfolio

Route: `/:username` (slug based)

What visitors see:

- Portfolio content (profile, about, timeline, experience, tech, projects, custom sections)
- Floating AI chat only if `chatEnabled` is true

If slug does not exist, portfolio returns not found.

## AI Chat

Public route UI via floating chat widget.

How it works:

- Visitor sends message from chat box
- Backend builds a system prompt from portfolio data only
- Gemini streams response back chunk-by-chunk
- Chat uses per-portfolio key if set, else app-level `GEMINI_API_KEY`

Behavior constraints:

- If chat is disabled on that portfolio, requests are rejected
- Assistant is instructed to avoid inventing details not in portfolio data

## Resume Builder

Route: `/dashboard/resume`

### Content tab

Edit:

- Header
- Summary
- Skills
- Experience
- Education
- Projects
- Languages
- Certifications, awards, volunteer, publications, custom sections

### Layout tab

- Reorder sections
- Toggle section visibility (except mandatory sections)
- Reset layout to defaults

### Validation

Live validation provides:

- Warnings (recommended limits)
- Errors (hard limits)
- Estimated page count

PDF export is blocked when hard errors exist.

### Templates

- `ats_classic_v1`
- `harvard_classic_v1`

### PDF Export

- Preview PDF: `/api/resumes/me/pdf`
- Download PDF: `/api/resumes/me/pdf?download=1`
- Public PDF by slug: `/api/resumes/:username/pdf`

### Resume -> Portfolio Sync

API endpoint exists: `POST /api/resumes/me/sync-portfolio`.

It maps resume data back into portfolio fields (summary, experiences, projects, skills, etc.) using server-side mapping logic.

## Step-by-Step Onboarding

1. Open app at `/signup` and create account.
2. Confirm redirect/login success, then open `/dashboard`.
3. In Dashboard, set your preferred public slug.
4. Open `Portfolio builder` -> `Edit portfolio`.
5. Fill `Profile` fields first (name, headline, location, contact links).
6. Upload avatar and cover, or set direct image URLs.
7. Add About markdown, timeline milestones, and experience bullets.
8. Add tech categories and project links.
9. In `Extras`, decide if portfolio chat should be enabled.
10. Save changes and open your public URL to verify display.
11. Back in Dashboard, create a new version before major edits.
12. Use draft versions for experiments; activate only finalized versions.
13. Open `/dashboard/resume` and fill resume content.
14. Fix validation errors, then preview/download PDF.
15. Re-check public portfolio and resume links before sharing.

## Troubleshooting

- `ERR_CONNECTION_REFUSED` on API calls:
  - Ensure backend is running on port `3000`
  - Check `VITE_API_BASE_URL`
- Unauthorized errors on dashboard routes:
  - Login again to refresh session cookie
- Chat not appearing on public page:
  - Ensure chat is enabled in Portfolio Builder `Extras`
- PDF export fails with `422`:
  - Resume has hard validation errors; resolve them first
