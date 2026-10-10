import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/Nav";
import { StatusPill } from "@/components/StatusPill";
import { SourceMark } from "@/components/SourceMark";
import { createIdea } from "../actions";

const STATUSES = ["new", "exploring", "building", "archived"] as const;

type IdeaRow = {
  id: string;
  title: string;
  body: string | null;
  status: string;
  source: "human" | "agent";
  created_at: string;
  profiles: { display_name: string } | null;
  idea_tags: { tags: { name: string } | null }[];
};

function buildHref(slug: string, params: URLSearchParams, key: string, value: string) {
  const next = new URLSearchParams(params);
  if (next.get(key) === value) next.delete(key);
  else next.set(key, value);
  const qs = next.toString();
  return `/${slug}${qs ? `?${qs}` : ""}`;
}

export default async function ProjectBoard({
  params,
  searchParams,
}: {
  params: Promise<{ project: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { project: slug } = await params;
  const sp = await searchParams;
  const spParams = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][],
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, slug, description")
    .eq("slug", slug)
    .maybeSingle();
  if (!project) notFound();

  const { data: ideasRaw } = await supabase
    .from("ideas")
    .select(
      "id, title, body, status, source, created_at, profiles!ideas_submitted_by_fkey(display_name), idea_tags(tags(name))",
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const ideas = (ideasRaw ?? []) as unknown as IdeaRow[];

  const allTags = Array.from(
    new Set(ideas.flatMap((i) => i.idea_tags.map((t) => t.tags?.name).filter(Boolean))),
  ) as string[];

  const statusFilter = sp.status;
  const sourceFilter = sp.source;
  const tagFilter = sp.tag;
  const q = sp.q?.toLowerCase().trim();

  const filtered = ideas.filter((i) => {
    if (statusFilter && i.status !== statusFilter) return false;
    if (sourceFilter && i.source !== sourceFilter) return false;
    if (tagFilter && !i.idea_tags.some((t) => t.tags?.name === tagFilter)) return false;
    if (q && !i.title.toLowerCase().includes(q) && !i.body?.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <>
      <Nav email={user.email ?? null} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
        <div className="flex items-baseline justify-between">
          <div>
            <Link href="/" className="font-mono text-xs text-ink-dim hover:text-accent">
              ← all projects
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            {project.description && (
              <p className="mt-1 text-sm text-ink-dim">{project.description}</p>
            )}
          </div>
          <p className="font-mono text-xs text-ink-dim">
            {filtered.length} of {ideas.length} idea{ideas.length === 1 ? "" : "s"}
          </p>
        </div>

        <form action={createIdea.bind(null, project.id, project.slug)} className="flex flex-col gap-2 border-b border-line pb-8">
          <input
            type="text"
            name="title"
            required
            placeholder="Drop an idea…"
            className="border-b border-line bg-transparent py-2 text-lg outline-none placeholder:text-ink-dim focus:border-accent"
          />
          <div className="flex gap-2">
            <input
              type="text"
              name="body"
              placeholder="Optional details"
              className="flex-1 border-b border-line bg-transparent py-1.5 text-sm outline-none placeholder:text-ink-dim focus:border-accent"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-ink"
            >
              Add
            </button>
          </div>
        </form>

        <form method="GET" className="flex flex-wrap items-center gap-2">
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={buildHref(slug, spParams, "status", s)}
              className="inline-flex"
            >
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-mono uppercase tracking-wide"
                style={{
                  background: statusFilter === s ? `var(--status-${s}-fg)` : `var(--status-${s}-bg)`,
                  color: statusFilter === s ? `var(--status-${s}-bg)` : `var(--status-${s}-fg)`,
                }}
              >
                {s}
              </span>
            </Link>
          ))}
          <span className="mx-1 text-ink-dim">·</span>
          {(["human", "agent"] as const).map((src) => (
            <Link
              key={src}
              href={buildHref(slug, spParams, "source", src)}
              className={`rounded-full px-2 py-0.5 text-[11px] font-mono ${
                sourceFilter === src ? "bg-ink text-paper" : "text-ink-dim"
              }`}
            >
              {src}
            </Link>
          ))}
          {allTags.length > 0 && <span className="mx-1 text-ink-dim">·</span>}
          {allTags.map((t) => (
            <Link
              key={t}
              href={buildHref(slug, spParams, "tag", t)}
              className={`rounded-full px-2 py-0.5 text-[11px] font-mono ${
                tagFilter === t ? "bg-ink text-paper" : "text-ink-dim"
              }`}
            >
              #{t}
            </Link>
          ))}
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="search…"
            className="ml-auto w-40 border-b border-line bg-transparent py-1 text-sm outline-none placeholder:text-ink-dim focus:border-accent"
          />
        </form>

        <ul className="flex flex-col">
          {filtered.map((idea) => (
            <li key={idea.id} className="border-b border-line py-3">
              <Link href={`/${slug}/ideas/${idea.id}`} className="flex flex-col gap-1.5 hover:text-accent">
                <div className="flex items-center gap-2">
                  <StatusPill status={idea.status} />
                  <SourceMark source={idea.source} />
                  <span className="font-mono text-[11px] text-ink-dim">
                    {idea.profiles?.display_name}
                  </span>
                </div>
                <p className="text-base leading-snug">{idea.title}</p>
                {idea.idea_tags.length > 0 && (
                  <p className="font-mono text-[11px] text-ink-dim">
                    {idea.idea_tags.map((t) => `#${t.tags?.name}`).join(" ")}
                  </p>
                )}
              </Link>
            </li>
          ))}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-ink-dim">
              {ideas.length === 0 ? "No ideas yet — drop the first one above." : "Nothing matches these filters."}
            </p>
          )}
        </ul>
      </main>
    </>
  );
}
