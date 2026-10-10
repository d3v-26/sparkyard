import { createAdminClient } from "./supabase/admin";

// Shared by scripts/invite-friend.ts and the /admin server actions.
// Skips Supabase's mailer (free tier can't customize templates) and builds
// our own /auth/confirm link from generateLink's token hash. 'invite' works
// for new emails; an existing user needs 'recovery' for a fresh link.
export async function generateInviteLink(
  email: string,
  displayName?: string,
): Promise<{ link: string } | { error: string }> {
  const supabase = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const redirectTo = `${siteUrl}/auth/confirm`;

  let { data, error } = await supabase.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo, data: displayName ? { display_name: displayName } : undefined },
  });

  if (error && /already registered|already been registered/i.test(error.message)) {
    ({ data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    }));
  }

  if (error || !data?.properties?.hashed_token) {
    return { error: error?.message ?? "no hashed_token returned" };
  }
  return {
    link: `${siteUrl}/auth/confirm?token_hash=${data.properties.hashed_token}&type=${data.properties.verification_type}`,
  };
}
