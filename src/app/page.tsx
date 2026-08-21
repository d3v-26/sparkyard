import { createClient } from "@/lib/supabase/server";

// Placeholder home page — proves auth is wired end-to-end. Real project
// list / board UI comes in Phase 4.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Sparkyard</h1>
      {user ? (
        <p>Signed in as {user.email}. Project board coming in Phase 4.</p>
      ) : (
        <p>Not signed in.</p>
      )}
    </main>
  );
}
