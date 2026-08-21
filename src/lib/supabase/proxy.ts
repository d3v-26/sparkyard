import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Called from the root src/proxy.ts (Next.js 16 renamed middleware ->
// proxy). Refreshes the Supabase auth session on every request so Server
// Components always see a valid session. Per Next.js + Supabase docs: this
// is defense-in-depth only — real authorization checks still happen inside
// each route/page, not here alone.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // /api routes (e.g. the agent-facing POST /api/ideas) authenticate via
  // their own x-api-key header, not a browser session cookie — never
  // redirect those to /login. /update-password must also be excluded: the
  // invite link lands there with the session in a URL *fragment* (never
  // sent to the server), so the server-side check here would otherwise
  // bounce the user away before client JS gets a chance to read it.
  const skipSessionGate =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth") ||
    request.nextUrl.pathname.startsWith("/update-password") ||
    request.nextUrl.pathname.startsWith("/api");

  if (!user && !skipSessionGate) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}
