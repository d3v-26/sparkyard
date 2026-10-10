import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/Nav";
import { createProject } from "./actions";

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: projects }, { data: ideas }] = await Promise.all([
    supabase.from("projects").select("id, name, slug, description, created_at").order("name"),
    supabase.from("ideas").select("project_id, created_at"),
  ]);

  const stats = new Map<string, { count: number; last: string | null }>();
  for (const idea of ideas ?? []) {
    const s = stats.get(idea.project_id) ?? { count: 0, last: null };
    s.count += 1;
    if (!s.last || idea.created_at > s.last) s.last = idea.created_at;
    stats.set(idea.project_id, s);
  }

  return (
    <>
      <Nav email={user.email ?? null} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="font-mono text-xs text-ink-dim">
            {projects?.length ?? 0} project{projects?.length === 1 ? "" : "s"}
          </p>
        </div>

        <form
          action={createProject}
          className="flex flex-col gap-2 border-b border-line pb-8"
        >
          <input
            type="text"
            name="name"
            required
            placeholder="Start a new project…"
            className="border-b border-line bg-transparent py-2 outline-none placeholder:text-ink-dim focus:border-accent"
          />
          <div className="flex gap-2">
            <input
              type="text"
              name="description"
              maxLength={140}
              placeholder="One-line description (optional)"
              className="flex-1 border-b border-line bg-transparent py-1.5 text-sm outline-none placeholder:text-ink-dim focus:border-accent"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-ink"
            >
              Create
            </button>
          </div>
        </form>

        <ul className="flex flex-col">
          {(projects ?? []).map((p) => {
            const s = stats.get(p.id);
            return (
              <li key={p.id} className="border-b border-line">
                <Link
                  href={`/${p.slug}`}
                  className="flex items-center justify-between gap-4 py-4 hover:text-accent"
                >
                  <span className="min-w-0">
                    <span className="block text-lg">{p.name}</span>
                    {p.description && (
                      <span className="block truncate text-sm text-ink-dim">{p.description}</span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-4 font-mono text-xs text-ink-dim">
                    <span>
                      {s?.count ?? 0} idea{s?.count === 1 ? "" : "s"}
                    </span>
                    <span>{s?.last ? relativeTime(s.last) : "no activity"}</span>
                  </span>
                </Link>
              </li>
            );
          })}
          {(projects ?? []).length === 0 && (
            <p className="py-8 text-center text-ink-dim">
              No projects yet — start one above.
            </p>
          )}
        </ul>
      </main>
    </>
  );
}
