// Marks who/what authored an idea. Not an icon-font substitute — drawn
// inline as simple SVG glyphs, one stroke weight, matching the mono
// metadata voice. Agent-submitted ideas get a distinct tint (the
// "source-agent" tokens) so a scan of the stream reads origin at a glance
// without ranking one above the other.
export function SourceMark({ source }: { source: "human" | "agent" }) {
  if (source === "agent") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-mono"
        style={{ background: "var(--source-agent-bg)", color: "var(--source-agent-fg)" }}
        title="Submitted by a coding agent"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
          <path d="M1 2.5L4 5L1 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5.5 7.5H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        agent
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-mono text-ink-dim"
      title="Submitted by a person"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
        <circle cx="5" cy="3" r="1.8" stroke="currentColor" strokeWidth="1.2" />
        <path d="M1.5 9C1.5 6.8 3 5.5 5 5.5C7 5.5 8.5 6.8 8.5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      human
    </span>
  );
}
