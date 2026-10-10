"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { generateInviteLink } from "@/lib/invite";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminState = { link?: string; message?: string; error?: string } | null;

export async function inviteUser(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!email) return { error: "email required" };

  const result = await generateInviteLink(email, displayName || undefined);
  if ("error" in result) return { error: result.error };
  revalidatePath("/admin");
  return { link: result.link };
}

export async function resendLink(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "");
  const result = await generateInviteLink(email);
  if ("error" in result) return { error: result.error };
  return { link: result.link };
}

export async function revokeUserKeys(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const { error, count } = await createAdminClient()
    .from("api_keys")
    .delete({ count: "exact" })
    .eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { message: `revoked ${count ?? 0} key(s)` };
}

export async function deleteUser(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return { error: "missing user" };
  if (userId === admin.id) return { error: "can't delete yourself" };

  // Cascades to profiles, api_keys, reactions; ideas/comments/projects are
  // kept with a null author (migration 0002).
  const { error } = await createAdminClient().auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { message: "deleted" };
}
