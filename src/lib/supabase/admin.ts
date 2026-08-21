import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — SERVER-ONLY. Bypasses RLS entirely. Never import
// this from a Client Component or anything that ships to the browser.
// Used by: the invite script (scripts/invite-friend.ts) and the agent API
// route (src/app/api/ideas/route.ts), both of which enforce authorization
// themselves before touching the database.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
