# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Sparkyard: invite-only shared inbox for project ideas for a small friend group. Humans submit via web UI; each friend's coding agent submits via `POST /api/ideas` with a personal API key. Every idea is attributed to a human and tagged `source: human|agent`. See `PRODUCT.md` (product/design context) and `PLAN.md` (phased build plan, decisions, rationale).

## Commands

```bash
npm run dev      # next dev
npm run build    # next build (also typechecks)
npm run lint     # eslint
npm run invite -- friend@example.com "Friend Name"   # tsx scripts/invite-friend.ts
```

No test suite. Next.js 16 / React 19 / Tailwind v4 — read `node_modules/next/dist/docs/` before writing Next code (see AGENTS.md).

Env (`.env`, gitignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key), `SUPABASE_SERVICE_ROLE_KEY` (secret key), `SUPABASE_ACCESS_TOKEN`, `ADMIN_EMAILS` (comma-separated admin emails), optional `NEXT_PUBLIC_SITE_URL`.

Schema changes: add a new file in `supabase/migrations/` (`0001_init.sql` holds all tables + RLS), apply with the Supabase CLI against the linked cloud project (no local Docker DB).

## Architecture

**Two auth paths, one database.**
- Browser: Supabase Auth, cookie sessions via `@supabase/ssr`. Use `src/lib/supabase/server.ts` (Server Components, actions, route handlers; create fresh per request) or `client.ts` (Client Components). These respect RLS as the signed-in user.
- Agent: `src/app/api/ideas/route.ts` reads `x-api-key`, SHA-256 hashes it (`src/lib/api-key.ts`, `spky_` prefix; only hash stored in `api_keys`), looks up the owner, then writes with the **service-role client** (`src/lib/supabase/admin.ts`, bypasses RLS, server-only). The route must do its own authorization. Supabase has no RLS-respecting personal-key feature, hence this custom layer. Keys are managed at `/settings/api-keys` via `src/app/api/settings/api-keys/route.ts`.

**`src/proxy.ts`** (Next 16's renamed middleware) calls `updateSession` in `src/lib/supabase/proxy.ts`: refreshes session and redirects unauthenticated users to `/login`. Exempt: `/login`, `/auth`, `/update-password`, `/api`. `/update-password` is exempt because invite links deliver the session in a URL fragment the server never sees. The proxy is defense-in-depth; real checks live in each page/route.

**Invite-only flow.** Public signup disabled in Supabase Auth. `scripts/invite-friend.ts` uses `auth.admin.generateLink` (no Supabase mailer — free tier can't customize templates) and prints a link to `/auth/confirm` (`src/app/auth/confirm/route.ts`), which verifies the OTP token hash server-side and sets cookies, then user sets a password at `/update-password`. Admin hand-sends the link.

**Admin.** `/admin` (invite links, resend link, revoke API keys, delete user). Admin = email in `ADMIN_EMAILS` (`src/lib/admin.ts`), deliberately not a `profiles` column since `profiles_update_own` RLS would let users self-promote. `requireAdmin()` must be called in the page AND every server action in `src/app/admin/actions.ts`. Link generation lives in `src/lib/invite.ts`, shared with the CLI script. Project slugs that collide with top-level routes are rejected (`RESERVED_SLUGS` in `src/app/actions.ts`). Migration `0002` makes author FKs `on delete set null` so deleting a user keeps their ideas/comments.

**Data model** (`supabase/migrations/0001_init.sql`): profiles (auto-created by `handle_new_user` trigger), projects (slug-addressed), ideas, tags/idea_tags, reactions, comments, api_keys. RLS: shared read for all authenticated users; writes scoped to owner (ideas are updatable by all; no delete policy).

**UI.** App Router routes: `/` (project list), `/[project]` (board with filters), `/[project]/ideas/[id]` (detail: status, reactions, comments). Mutations are Server Actions in `src/app/actions.ts`. Shared components in `src/components/`. Design context in `PRODUCT.md`/`.impeccable/`; board is optimized for glanceable quick-capture scanning, mobile included.
