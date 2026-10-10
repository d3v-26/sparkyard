"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Top-level routes that a project slug must not shadow.
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "login",
  "settings",
  "update-password",
]);

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const description = String(formData.get("description") ?? "").trim();

  const slug = slugify(name);
  if (!slug || RESERVED_SLUGS.has(slug)) return;
  const { error } = await supabase
    .from("projects")
    .insert({ name, slug, description: description || null, created_by: user.id });

  if (!error) {
    revalidatePath("/");
    redirect(`/${slug}`);
  }
}

export async function createIdea(projectId: string, projectSlug: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const body = String(formData.get("body") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("ideas").insert({
    project_id: projectId,
    title,
    body: body || null,
    submitted_by: user.id,
    source: "human",
  });

  revalidatePath(`/${projectSlug}`);
}

export async function setIdeaStatus(ideaId: string, projectSlug: string, status: string) {
  const supabase = await createClient();
  await supabase.from("ideas").update({ status }).eq("id", ideaId);
  revalidatePath(`/${projectSlug}`);
  revalidatePath(`/${projectSlug}/ideas/${ideaId}`);
}

export async function addComment(ideaId: string, projectSlug: string, formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("comments").insert({ idea_id: ideaId, author_id: user.id, body });
  revalidatePath(`/${projectSlug}/ideas/${ideaId}`);
}

export async function toggleReaction(
  ideaId: string,
  projectSlug: string,
  emoji: string,
  active: boolean,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (active) {
    await supabase
      .from("reactions")
      .delete()
      .eq("idea_id", ideaId)
      .eq("user_id", user.id)
      .eq("emoji", emoji);
  } else {
    await supabase.from("reactions").insert({ idea_id: ideaId, user_id: user.id, emoji });
  }
  revalidatePath(`/${projectSlug}/ideas/${ideaId}`);
}
