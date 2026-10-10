/**
 * Invite a friend to Sparkyard (CLI twin of the /admin page).
 *
 * Usage:
 *   npx tsx scripts/invite-friend.ts friend@example.com "Friend Name"
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL (+
 * NEXT_PUBLIC_SITE_URL for production links) in .env. Prints a link instead
 * of emailing — see src/lib/invite.ts for why. Copy/paste it to the friend
 * yourself.
 */
import "dotenv/config";
import { generateInviteLink } from "../src/lib/invite";

const [, , email, displayName] = process.argv;

if (!email) {
  console.error('Usage: npx tsx scripts/invite-friend.ts <email> ["Display Name"]');
  process.exit(1);
}

const result = await generateInviteLink(email, displayName);

if ("error" in result) {
  console.error("Invite failed:", result.error);
  process.exit(1);
}

console.log(`Link for ${email}:\n${result.link}\n`);
console.log("Send this to them yourself — it logs them straight into /update-password to set their own password.");
