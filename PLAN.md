# Ideas Board — Build Plan

Shared project-idea tracker for a friend group. Humans use the web UI; each
friend's coding agent adds ideas via a REST endpoint + personal API key.

Locked decisions (from user):
- Backend: **Supabase** (Postgres + Auth + auto REST)
- Agent input: **REST API + personal API key**
- Access: **invite-only accounts**
- Frontend: **Next.js (App Router) on Vercel**

---

## Phase 0 — Documentation Discovery (done)

Researched official docs, current as of 2026-08-21. Full findings kept in
conversation; key **allowed APIs / facts to build against**:

**Supabase**
- Use `@supabase/ssr` (NOT `@supabase/auth-helpers-nextjs` — npm-deprecated).
  `createBrowserClient()` for client components, `createServerClient()` for
  server components / route handlers / middleware.
- `supabase-js` v2: `createClient(url, key, options)`.
- Invite-only signup: disable "Allow new users to sign up" in Auth settings
  + `supabase.auth.admin.inviteUserByEmail(email, { redirectTo, data })`
  (service-role only, server-side). Optionally layer a **Before User Created
  Hook** (Postgres function or Edge Function) as a domain/email allowlist.
- RLS: `create policy "<name>" on <table> for <op> to <role> using (...) with check (...)`.
  Wrap `auth.uid()` as `(select auth.uid())` for perf.
- **Important gap**: Supabase has **no built-in personal/scoped API key that
  respects RLS on the Data API**. Only publishable (RLS-respecting but
  identity-less) and secret/service_role (bypasses RLS entirely) keys exist.
  → A "personal API key per friend" must be **custom-built** (see Phase 3),
  not a Supabase feature. Don't expose PostgREST directly to agents.
- Free tier: 500MB DB, 50k MAU, unlimited API requests, project **auto-pauses
  after 1 week idle** (worth knowing for a low-traffic side project).

**Next.js / Vercel**
- Route handlers: `app/api/.../route.ts`, export `GET/POST/PUT/DELETE/PATCH`,
  `await request.json()`, `NextResponse.json(...)`.
- `middleware.ts` is renamed **`proxy.ts`** in current Next.js (16). Docs
  explicitly warn: don't rely on proxy alone for auth — verify inside each
  route handler too.
- No official Next.js "API key auth" primitive — header-check-against-DB is
  standard practice, not a named framework feature. This is fine, it's what
  we're building.
- Deploy: connect GitHub repo in Vercel dashboard → auto-deploys on push to
  `main`; env vars via dashboard or `vercel env add`.
- Hobby plan: 1M function invocations, 100GB bandwidth, 10s default/60s max
  function duration, 1 rate-limit firewall rule included — plenty for this.
- No built-in rate limiting in Next.js itself; Vercel WAF gives 1 rule free
  on Hobby, otherwise Upstash is the ecosystem-standard add-on (optional,
  not needed at friend-group scale).

---

## Phase 1 — Supabase project + schema + RLS

**Do:**
1. Create Supabase project (supabase.com dashboard).
2. Schema (single shared workspace — one friend group, keep it simple):

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_agent boolean not null default false,   -- true if this identity posts via API key
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table ideas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  body text,
  status text not null default 'new'
    check (status in ('new','exploring','building','archived')),
  submitted_by uuid references profiles(id),
  source text not null default 'human' check (source in ('human','agent')),
  created_at timestamptz not null default now()
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table idea_tags (
  idea_id uuid references ideas(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (idea_id, tag_id)
);

create table reactions (
  idea_id uuid references ideas(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  emoji text not null default '👍',
  primary key (idea_id, user_id, emoji)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table api_keys (        -- custom, see Phase 3 — not a Supabase feature
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  key_hash text not null unique,   -- sha256 of the actual key, never store raw
  label text,                       -- e.g. "devrpatel26's Claude Code"
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
```

3. RLS: enable on every table, policies scoped `to authenticated`, all
   reads/writes gated on `auth.uid()` being a row in `profiles` (i.e. any
   invited member can read/write everything — it's one shared friend group,
   not multi-tenant). `api_keys` policy: users can only see/manage their own
   rows.

**Verify:** `select * from ideas` as an anon key → denied. As a signed-in
member → allowed. Confirm via Supabase dashboard SQL editor + a quick
`supabase-js` script.

**Anti-pattern guard:** do not skip RLS "for now" — Supabase tables are
publicly reachable by URL once the project exists.

---

## Phase 2 — Auth (invite-only)

**Do:**
1. Auth settings: disable public signup.
2. Server-side invite script/route (service-role key, **never** shipped to
   client) calling `auth.admin.inviteUserByEmail()` for each friend.
3. On first login, a Postgres trigger (or Next.js callback) creates the
   matching `profiles` row.
4. Next.js side: `@supabase/ssr` — `createBrowserClient` for client
   components, `createServerClient` (cookie-based) for server components and
   route handlers, per current docs.

**Verify:** uninvited email can't sign up; invited email gets magic
link/password flow and lands with a `profiles` row created.

**Onboarding flow (confirmed working, built + tested end-to-end):**
- Free-tier Supabase can't customize the built-in invite-email template
  (paid plan or custom SMTP required) — and the default hosted-verify
  redirect only sets a *browser* session anyway, never a cookie, which
  `@supabase/ssr`'s server components/proxy actually need. So `npm run
  invite -- <email> "Name"` (`scripts/invite-friend.ts`) uses the
  documented `auth.admin.generateLink()` instead of
  `inviteUserByEmail()` — no email gets sent by Supabase at all. It prints
  a link for you to send the friend yourself (text/email/whatever).
- That link hits `src/app/auth/confirm/route.ts`, which verifies the token
  **server-side** (`auth.verifyOtp`) and writes the session to a cookie —
  this is the part that has to happen server-side; a client-only
  hash-token approach was tried first and failed ("Auth session missing!")
  because the server-rendered pages never saw that session.
- Friend lands on `/update-password` already signed in (cookie-based),
  sets a password, done. Same script/link also works for existing
  unconfirmed users (falls back to `type: recovery` automatically).
- Self-serves own API key at `/settings/api-keys` (Phase 3) once logged in.

---

## Phase 3 — Agent API (the custom, "very custom" part)

This is DIY on top of Supabase — documented above as a gap, not a feature.

**Design:** agents never talk to PostgREST directly. They POST to a Next.js
route handler, which validates the key server-side (service-role client,
RLS bypassed intentionally *only* inside this trusted server code) and
inserts on the key owner's behalf.

```
POST /api/ideas
Headers: x-api-key: <raw key>
Body: { "project": "slug-or-uuid", "title": "...", "body": "...", "tags": ["..."] }
```

Route handler logic (`app/api/ideas/route.ts`):
1. Read `x-api-key` header (`request.headers.get('x-api-key')`).
2. `sha256` it, look up `api_keys` by `key_hash`.
3. No match → `401`. Match → get `user_id`, update `last_used_at`.
4. Insert idea with `submitted_by = user_id`, `source = 'agent'`, using the
   **service-role** Supabase client (server-only env var, never exposed).
5. Return `NextResponse.json({ id, url }, { status: 201 })`.

Key generation: a settings page (`/settings/api-keys`) where a logged-in
human generates a raw key (shown once), stores only its hash. Friends hand
that key to their own coding agent's env/config (e.g. `IDEAS_API_KEY`) and
`curl`/fetch it from any agent.

**Verify:** `curl -X POST .../api/ideas -H "x-api-key: $KEY" -d '{...}'`
creates a row attributed to the right user; bad/missing key → 401; revoked
key (delete row) → 401 immediately after.

**Anti-pattern guard:** don't expose the service-role key to the browser or
to agents directly — it bypasses RLS entirely and must stay server-side env
only (`SUPABASE_SERVICE_ROLE_KEY`, not `NEXT_PUBLIC_*`).

---

## Phase 4 — Frontend pages (Next.js App Router)

Core pages:
- `/` — project list (cards: name, idea count, latest activity)
- `/[project]` — idea board for one project: list/kanban by status, filter
  by tag/status/source(human|agent), search
- `/[project]/ideas/[id]` — idea detail: body, tags, status changer,
  comments, reactions
- `/settings/api-keys` — generate/revoke personal API keys
- `/login`, invite-acceptance flow

Use `createServerClient` in server components for data fetching (fast,
no client-side loading spinners for the main board), client components only
for interactive bits (status dropdown, comment box, reactions, key gen).

**Verify:** each page renders with real Supabase data; RLS still enforced
(log out → redirected, not just hidden).

---

## Phase 4a — Custom design pass ("make it very custom")

Before hand-coding UI: use the **`design`** skill to draft a canvas
mockup (multi-artboard) of the project list, idea board, and idea detail
views, so the look gets nailed down and tweaked visually first. Then, when
implementing the real Next.js components, use the **`design-taste-frontend`**
skill (anti-generic-AI-slop) or **`impeccable`** skill to push past default
shadcn/Tailwind template look — real typography choice, spacing rhythm,
one distinct visual idea (not just "rounded cards + gradient").

**Verify:** compare implemented pages side-by-side against the mockup.

---

## Phase 4b — Friend onboarding kit

Deliverable: short doc/page handed to each friend alongside their invite,
so they self-serve the whole agent setup. Two parts:

1. **`ONBOARDING.md`** (or in-app `/docs` page) — human-facing:
   - click the link sent to you (from `npm run invite`), set password, log in
   - go to `/settings/api-keys`, click generate, copy key **(shown once)**
   - set it as an env var for their coding agent, e.g.
     `export IDEAS_API_KEY=sk_...` (name TBD, keep consistent)
2. **Machine-facing snippet** they paste into their agent's context /
   CLAUDE.md / system prompt, e.g.:

```
To add a project idea, POST to https://<your-domain>/api/ideas
Headers: x-api-key: $IDEAS_API_KEY, Content-Type: application/json
Body: {"project": "<slug>", "title": "...", "body": "...", "tags": ["..."]}
Example: curl -X POST https://<your-domain>/api/ideas \
  -H "x-api-key: $IDEAS_API_KEY" -H "Content-Type: application/json" \
  -d '{"project":"side-projects","title":"...","body":"..."}'
```

This snippet doubles as the de-facto API spec agents work from — keep it in
sync with the real route handler contract in Phase 3.

**Verify:** a friend with zero context, following only this doc, gets their
own agent successfully POSTing an idea within a few minutes.

---

## Phase 5 — Deployment

1. Push repo to GitHub.
2. Vercel dashboard → New Project → import repo → set env vars
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`) scoped to Production (+ Preview if wanted).
3. Deploy; confirm push-to-`main` auto-redeploys.
4. Optional: Vercel WAF rate-limit rule on `/api/ideas` (1 free on Hobby) to
   blunt a runaway/misbehaving agent script.

**Verify:** production URL loads, login works, `POST /api/ideas` works
against the deployed URL from a real coding-agent shell.

---

## Phase 6 — Final Verification

- [ ] RLS confirmed on every table (no anon access to `ideas`, `comments`, etc.)
- [ ] Uninvited signup blocked
- [ ] Service-role key never in client bundle (`grep -r SERVICE_ROLE` in
      `.next` build output finds nothing)
- [ ] Agent flow tested end-to-end from an actual coding agent (curl/script)
- [ ] Revoking an API key immediately blocks further inserts
- [ ] Mobile-width layout usable (friends will check this from phones)

---

## Open items for you before Phase 1 starts

- Final list of friends' emails to invite
- Project naming convention (slugs) — freeform or fixed set upfront?
- Any specific visual direction (dark/light, playful/serious) for the
  Phase 4a mockup — or let the design skill propose one?
