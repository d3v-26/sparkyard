import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Nav } from "@/components/Nav";
import { InviteForm, UserActions } from "./AdminForms";

export default async function AdminPage() {
  const me = await requireAdmin();
  const admin = createAdminClient();

  const [{ data: usersData }, { data: profiles }, { data: ideas }, { data: keys }] =
    await Promise.all([
      admin.auth.admin.listUsers({ perPage: 200 }),
      admin.from("profiles").select("id, display_name"),
      admin.from("ideas").select("submitted_by"),
      admin.from("api_keys").select("user_id"),
    ]);

  const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  const tally = (rows: { [k: string]: string | null }[] | null, col: string) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) {
      const id = r[col];
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  };
  const ideaCounts = tally(ideas, "submitted_by");
  const keyCounts = tally(keys, "user_id");
  const users = usersData?.users ?? [];

  return (
    <>
      <Nav email={me.email ?? null} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>

        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs text-ink-dim">invite</h2>
          <InviteForm />
        </section>

        <section className="flex flex-col">
          <h2 className="mb-2 font-mono text-xs text-ink-dim">
            {users.length} user{users.length === 1 ? "" : "s"}
          </h2>
          <ul>
            {users.map((u) => (
              <li key={u.id} className="flex flex-col gap-2 border-b border-line py-4 text-sm">
                <div>
                  <p>
                    {names.get(u.id) ?? "(no profile)"}{" "}
                    <span className="text-ink-dim">{u.email}</span>
                  </p>
                  <p className="font-mono text-[11px] text-ink-dim">
                    {u.last_sign_in_at
                      ? `last sign-in ${new Date(u.last_sign_in_at).toLocaleDateString()}`
                      : "pending — never signed in"}{" "}
                    · {ideaCounts.get(u.id) ?? 0} ideas · {keyCounts.get(u.id) ?? 0} keys
                  </p>
                </div>
                <UserActions
                  userId={u.id}
                  email={u.email ?? ""}
                  isSelf={u.id === me.id}
                  keyCount={keyCounts.get(u.id) ?? 0}
                />
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
