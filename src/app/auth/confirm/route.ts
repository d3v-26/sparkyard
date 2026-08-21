import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the invite link (see scripts/invite-friend.ts). Verifies the
// token server-side via supabase-js's documented
// `auth.verifyOtp({ type, token_hash })` using the *server* client, so the
// resulting session is written to cookies (what @supabase/ssr's server
// components/proxy actually read) rather than only browser storage —
// hash-fragment tokens never reach the server, which is why the earlier
// client-side-only approach failed with "Auth session missing!".
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Invited/reset friends land here with no password set yet.
  const next = type === "invite" || type === "recovery" ? "/update-password" : "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirm_failed`);
}
