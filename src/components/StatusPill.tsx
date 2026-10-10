const LABEL: Record<string, string> = {
  new: "new",
  exploring: "exploring",
  building: "building",
  archived: "archived",
};

// Status reads as a small mono text pill (colored fill, not a border
// stripe — border-left status markers are the lazy default this world
// refuses). Colors come from the palette tokens in globals.css.
export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-mono uppercase tracking-wide"
      style={{
        background: `var(--status-${status}-bg)`,
        color: `var(--status-${status}-fg)`,
      }}
    >
      {LABEL[status] ?? status}
    </span>
  );
}
