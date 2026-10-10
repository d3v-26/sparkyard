import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/Nav";
import { StatusPill } from "@/components/StatusPill";
import { SourceMark } from "@/components/SourceMark";
import { setIdeaStatus, addComment, toggleReaction } from "../../../actions";

const STATUSES = ["new", "exploring", "building", "archived"] as const;
const EMOJI = ["👍", "🔥", "💡", "🤔"] as const;

export default async function IdeaDetail({
  params,
}: {
  params: Promise<{ project: string; id: string }>;
}) {
  const { project: slug, id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: idea } = await supabase
    .from("ideas")
    .select(
      "id, title, body, status, source, created_at, submitted_by, profiles!ideas_submitted_by_fkey(display_name), idea_tags(tags(name)), projects(slug, name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!idea || (idea.projects as unknown as { slug: string })?.slug !== slug) notFound();

  const [{ data: comments }, { data: reactions }] = await Promise.all([
    supabase
      .from("comments")
      .select("id, body, created_at, profiles(display_name)")
      .eq("idea_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("reactions").select("emoji, user_id").eq("idea_id", id),
  ]);

  const reactionCounts = new Map<string, { count: number; mine: boolean }>();
  for (const r of reactions ?? []) {
    const c = reactionCounts.get(r.emoji) ?? { count: 0, mine: false };
    c.count += 1;
    if (r.user_id === user.id) c.mine = true;
    reactionCounts.set(r.emoji, c);
  }

  const submitter = idea.profiles as unknown as { display_name: string } | null;
  const tags = (idea.idea_tags as unknown as { tags: { name: string } | null }[]) ?? [];

  return (
    <>
      <Nav email={user.email ?? null} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10">
        <Link href={`/${slug}`} className="font-mono text-xs text-ink-dim hover:text-accent">
          ← {(idea.projects as unknown as { name: string })?.name}
        </Link>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <SourceMark source={idea.source as "human" | "agent"} />
            <span className="font-mono text-[11px] text-ink-dim">
              {submitter?.display_name} · {new Date(idea.created_at).toLocaleString()}
            </span>
          </div>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight">{idea.title}</h1>
          {idea.body && <p className="max-w-[70ch] leading-relaxed text-ink">{idea.body}</p>}
          {tags.length > 0 && (
            <p className="font-mono text-xs text-ink-dim">
              {tags.map((t) => `#${t.tags?.name}`).join(" ")}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-y border-line py-4">
          {STATUSES.map((s) => (
            <form key={s} action={setIdeaStatus.bind(null, idea.id, slug, s)}>
              <button type="submit" disabled={idea.status === s}>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-mono uppercase tracking-wide disabled:opacity-100"
                  style={{
                    background: idea.status === s ? `var(--status-${s}-fg)` : `var(--status-${s}-bg)`,
                    color: idea.status === s ? `var(--status-${s}-bg)` : `var(--status-${s}-fg)`,
                  }}
                >
                  {s}
                </span>
              </button>
            </form>
          ))}
          <span className="mx-2 h-4 w-px bg-line" />
          {EMOJI.map((emoji) => {
            const r = reactionCounts.get(emoji);
            return (
              <form key={emoji} action={toggleReaction.bind(null, idea.id, slug, emoji, !!r?.mine)}>
                <button
                  type="submit"
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                    r?.mine ? "border-accent bg-accent/10" : "border-line"
                  }`}
                >
                  <span>{emoji}</span>
                  {r?.count ? <span className="font-mono text-ink-dim">{r.count}</span> : null}
                </button>
              </form>
            );
          })}
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="font-mono text-xs uppercase tracking-wide text-ink-dim">
            Comments ({comments?.length ?? 0})
          </h2>
          <ul className="flex flex-col gap-4">
            {(comments ?? []).map((c) => (
              <li key={c.id} className="flex flex-col gap-1">
                <p className="font-mono text-[11px] text-ink-dim">
                  {(c.profiles as unknown as { display_name: string } | null)?.display_name} ·{" "}
                  {new Date(c.created_at).toLocaleString()}
                </p>
                <p className="max-w-[70ch] leading-relaxed">{c.body}</p>
              </li>
            ))}
          </ul>
          <form action={addComment.bind(null, idea.id, slug)} className="flex gap-2">
            <input
              type="text"
              name="body"
              required
              placeholder="Add a comment…"
              className="flex-1 border-b border-line bg-transparent py-2 text-sm outline-none placeholder:text-ink-dim focus:border-accent"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-ink"
            >
              Post
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
