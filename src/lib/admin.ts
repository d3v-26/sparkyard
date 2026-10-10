import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Admins are listed by email in the ADMIN_EMAILS env var (comma-separated).
// Deliberately not a column on profiles: profiles_update_own RLS would let
// any user flip their own flag.
export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

// Call at the top of the admin page and of EVERY admin server action —
// server actions are public POST endpoints, the page check alone is not
// enough. Non-admins get a 404 so the route's existence isn't revealed.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) notFound();
  return user;
}
