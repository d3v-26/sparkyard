import { getSiteUrl } from "@/lib/site-url";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashApiKey } from "@/lib/api-key";

// Agent-facing endpoint. A coding agent POSTs here with a personal API key
// (generated at /settings/api-keys) instead of signing in — see
// PLAN.md Phase 3 for why this exists as custom code rather than exposing
// Supabase's PostgREST directly (no RLS-respecting personal key feature).
//
// POST /api/ideas
// Headers: x-api-key: <raw key>, Content-Type: application/json
// Body: { "project": "<slug>", "title": "...", "body"?: "...", "tags"?: ["..."] }
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "missing x-api-key header" }, { status: 401 });
  }

  const admin = createAdminClient();
  const keyHash = hashApiKey(apiKey);

  const { data: keyRow } = await admin
    .from("api_keys")
    .select("id, user_id")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (!keyRow) {
    return NextResponse.json({ error: "invalid api key" }, { status: 401 });
  }

  // Fire-and-forget — don't block the request on this bookkeeping write.
  admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRow.id)
    .then(() => {});

  let payload: { project?: string; title?: string; body?: string; tags?: string[] };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { project: projectSlug, title, body, tags } = payload;
  if (!projectSlug || !title) {
    return NextResponse.json(
      { error: "'project' (slug) and 'title' are required" },
      { status: 400 },
    );
  }

  const { data: project } = await admin
    .from("projects")
    .select("id, slug")
    .eq("slug", projectSlug)
    .maybeSingle();

  if (!project) {
    return NextResponse.json(
      { error: `no project with slug '${projectSlug}'` },
      { status: 404 },
    );
  }

  const { data: idea, error: ideaError } = await admin
    .from("ideas")
    .insert({
      project_id: project.id,
      title,
      body: body ?? null,
      submitted_by: keyRow.user_id,
      source: "agent",
    })
    .select("id")
    .single();

  if (ideaError || !idea) {
    return NextResponse.json({ error: "failed to create idea" }, { status: 500 });
  }

  if (tags && tags.length > 0) {
    const tagIds: string[] = [];
    for (const name of tags) {
      const clean = name.trim().toLowerCase();
      if (!clean) continue;
      const { data: tag } = await admin
        .from("tags")
        .upsert({ name: clean }, { onConflict: "name" })
        .select("id")
        .single();
      if (tag) tagIds.push(tag.id);
    }
    if (tagIds.length > 0) {
      await admin
        .from("idea_tags")
        .insert(tagIds.map((tag_id) => ({ idea_id: idea.id, tag_id })));
    }
  }

  const siteUrl = getSiteUrl();
  return NextResponse.json(
    { id: idea.id, project: project.slug, url: `${siteUrl}/${project.slug}/ideas/${idea.id}` },
    { status: 201 },
  );
}
