"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ApiKey = {
  id: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [label, setLabel] = useState("");
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadKeys() {
    const res = await fetch("/api/settings/api-keys");
    const data = await res.json();
    if (res.ok) setKeys(data.keys);
  }

  useEffect(() => {
    loadKeys();
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNewRawKey(null);

    const res = await fetch("/api/settings/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }
    setNewRawKey(data.raw);
    setLabel("");
    loadKeys();
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this key? Anything using it stops working immediately.")) return;
    await fetch("/api/settings/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadKeys();
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10">
      <Link href="/" className="font-mono text-xs text-ink-dim hover:text-accent">
        ← Sparkyard
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">API keys</h1>
      <p className="text-sm text-ink-dim">
        Give this key to your own coding agent to post ideas via{" "}
        <code className="font-mono text-ink">POST /api/ideas</code> with an{" "}
        <code className="font-mono text-ink">x-api-key</code> header.
      </p>

      {newRawKey && (
        <div className="border border-accent px-4 py-3 text-sm">
          <p className="mb-2 font-medium">Copy this now — it won&apos;t be shown again:</p>
          <code className="break-all font-mono text-accent">{newRawKey}</code>
        </div>
      )}

      <form onSubmit={handleGenerate} className="flex gap-2 border-b border-line pb-6">
        <input
          type="text"
          placeholder="Label (e.g. Claude Code)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="flex-1 border-b border-line bg-transparent py-2 outline-none placeholder:text-ink-dim focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink disabled:opacity-50"
        >
          Generate
        </button>
      </form>
      {error && <p className="text-sm text-accent">{error}</p>}

      <ul className="flex flex-col">
        {keys.map((k) => (
          <li key={k.id} className="flex items-center justify-between border-b border-line py-3 text-sm">
            <div>
              <p>{k.label || "(unlabeled)"}</p>
              <p className="font-mono text-[11px] text-ink-dim">
                created {new Date(k.created_at).toLocaleDateString()} · last used{" "}
                {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "never"}
              </p>
            </div>
            <button onClick={() => handleRevoke(k.id)} className="font-mono text-xs text-accent hover:underline">
              revoke
            </button>
          </li>
        ))}
        {keys.length === 0 && <p className="py-4 text-sm text-ink-dim">No keys yet.</p>}
      </ul>
    </main>
  );
}
