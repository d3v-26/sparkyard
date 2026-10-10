/**
 * DIRECTION CONTRACT (Sparkyard, Phase 4a — impeccable skill, Operate mode)
 * THESIS: a shared capture stream, not a project-management board — refuses
 *   the kanban/card-grid default that turns idea-logging into ceremony.
 * OWN-WORLD: warm paper ground, one ember accent, two-voice type — a
 *   humanist sans for what people write, a mono for what the system
 *   records (timestamps, source, status, tags) — literalizing the
 *   human/agent duality the product is actually built on. Status shown as
 *   text pills, never border stripes.
 * STORY: scan a dense stream of ideas across projects, filter by
 *   status/tag/source in seconds, open one to read/discuss/react.
 * FIRST VIEWPORT: project list as a dense single-column stream of rows
 *   (name, idea count, last activity in mono) — no card grid.
 * FORM: direct-authored, code-led — catalog roll skipped as disclosed
 *   substitution (Operate-mode internal tool, no image generation).
 * FINISH: unreviewed and undocumented is unfinished; this build ends with
 *   the finish review, the verdict, DESIGN.md, and every shipping raster
 *   carrying its provenance.
 */
import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const sans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Sparkyard",
  description: "A shared idea stream for the group.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
