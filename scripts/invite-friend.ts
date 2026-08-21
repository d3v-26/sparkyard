/**
 * Invite a friend to Sparkyard.
 *
 * Usage:
 *   npx tsx scripts/invite-friend.ts friend@example.com "Friend Name"
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env
 * (loaded via `dotenv` below — never commit .env, it's gitignored).
 *
 * Free-tier Supabase projects can't customize the built-in invite email
 * template (needs a paid plan or custom SMTP), and the default template's
 * hosted-verify redirect only gives the browser a session — never the
 * server, which @supabase/ssr's cookie-based auth actually needs. So this
 * skips Supabase's mailer entirely and uses the documented
 * `auth.admin.generateLink({ type, email, options })` instead, which
 * returns a real token_hash without sending anything. We build our own
 * link pointing at /auth/confirm (verifies server-side, sets cookies) and
 * print it here — you copy/paste it to the friend yourself (email, iMessage,
 * whatever), alongside their API key + onboarding instructions.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const [, , email, displayName] = process.argv;

if (!email) {
  console.error('Usage: npx tsx scripts/invite-friend.ts <email> ["Display Name"]');
  process.exit(1);
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// type: 'invite' works for brand-new emails. If this email was already
// invited before (user exists, unconfirmed), Supabase's admin API wants
// type: 'recovery' instead to issue a fresh link for the same account —
// try invite first, fall back to recovery on the "already registered" case.
async function generate(type: "invite" | "recovery") {
  return supabase.auth.admin.generateLink(
    type === "invite"
      ? {
          type: "invite",
          email,
          options: {
            redirectTo: `${siteUrl}/auth/confirm`,
            data: displayName ? { display_name: displayName } : undefined,
          },
        }
      : { type: "recovery", email, options: { redirectTo: `${siteUrl}/auth/confirm` } },
  );
}

let { data, error } = await generate("invite");

if (error && /already registered|already been registered/i.test(error.message)) {
  ({ data, error } = await generate("recovery"));
}

if (error || !data?.properties?.hashed_token) {
  console.error("Invite failed:", error?.message ?? "no hashed_token returned");
  process.exit(1);
}

const link = `${siteUrl}/auth/confirm?token_hash=${data.properties.hashed_token}&type=${data.properties.verification_type}`;

console.log(`Link for ${email}:\n${link}\n`);
console.log("Send this to them yourself — it logs them straight into /update-password to set their own password.");
