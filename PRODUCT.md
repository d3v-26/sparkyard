# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + Tailwind v4 + Supabase (Postgres, Auth, cookie-based
session via `@supabase/ssr`). User-decided, not delegated — see PLAN.md.

## Users

A small closed friend group (invite-only, no public signup) who each run
their own coding agent (Claude Code, etc.) alongside normal human use. Two
submission paths into the same board: a human typing in the web UI, or
their coding agent POSTing via a personal API key. Every idea is
attributed to the human it belongs to either way, tagged `source: human`
or `source: agent`.

Job: capture a project idea — human or AI-generated — fast enough that it
doesn't get lost, park it somewhere shared instead of a private notes app,
and later scan across everything captured to decide what's worth building
next.

## Product Purpose

A shared inbox for project ideas across an open-ended number of projects.
Exists because ideas surface constantly (in conversation, while coding,
mid-agent-session) and get lost without a shared, low-friction place to
drop them. Success = an idea gets captured in seconds and is easy to find
again later, by anyone in the group, regardless of who or what submitted
it.

## Positioning

The thing a generic Notion/Trello board can't do: a personal API key per
friend that lets their own coding agent add ideas directly and
autonomously, attributed to them, without a human touching a UI. This is
the mechanism, not a bolt-on — it's the reason the product exists rather
than reusing an existing tool.

## Operating Context

- Invite-only: an admin (the user) generates a link via a CLI script and
  hand-sends it; no self-serve signup.
- Friends check this from their phones as often as their laptops.
- Agents call the API headlessly (curl/fetch from within an agent session)
  — no browser involved on that path at all.
- Confirmed primary usage pattern: **quick-capture first**. Most ideas are
  terse (a title, maybe a sentence) and dropped to be scanned later, not
  drafted. The board is read like an inbox/stream, not a project-planning
  tool. Comments, reactions, and status changes exist and matter, but are
  secondary to fast scanning of many ideas at a glance — design should
  optimize for glanceability and volume over per-idea depth.

## Capabilities and Constraints

- Multiple concurrent "projects" (arbitrary future software projects the
  group might build); each idea belongs to exactly one project.
- Idea fields: title, body (optional), status (`new` / `exploring` /
  `building` / `archived`), free-form tags, submitter, source
  (human/agent).
- Comments and emoji reactions per idea.
- Auth: Supabase-backed, invite-only, cookie session (`@supabase/ssr`).
- Agent auth: separate mechanism — personal API key
  (`x-api-key` header on `POST /api/ideas`), independent of the browser
  session, self-generated/revoked per user at `/settings/api-keys`.
- RLS: every authenticated member can read/write across the whole shared
  workspace — no per-project membership/permission tiers (single trusted
  friend group, not multi-tenant).
- Small user count (a friend group, not a company) — designs should not
  assume enterprise scale, but should stay pleasant at "years of
  accumulated ideas across many projects" volume.

## Brand Commitments

Name: **Sparkyard**. No existing visual identity, logo, or palette yet —
this is genuinely greenfield on the visual side.

## Evidence on Hand

None. No existing content, sample ideas, or brand assets to preserve.

## Product Principles

1. Capture beats curation — never make logging an idea feel like writing
   a ticket; the fastest path (agent API, or a one-line human input) is
   the primary path, not an edge case.
2. Human and agent contributions are equal citizens, visually
   distinguished but never hierarchically ranked (an agent's idea isn't
   "lesser" than a human's).
3. Built for a stream that grows for years — scanability at volume
   matters more than any single idea's presentation.
4. Small trusted group, not a company tool — no permission ceremony,
   no enterprise IA patterns, personality is allowed.

## Accessibility & Inclusion

No specific requirement established beyond standard web accessibility
(keyboard nav, contrast, readable at small viewport sizes given frequent
phone use).
