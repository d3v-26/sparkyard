"use client";

import { useEffect, useState } from "react";

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
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">API keys</h1>
      <p className="text-sm text-neutral-500">
        Give this key to your own coding agent to post ideas via{" "}
        <code>POST /api/ideas</code> with an <code>x-api-key</code> header.
      </p>

      {newRawKey && (
        <div className="rounded border border-amber-400 bg-amber-50 p-4 text-sm">
          <p className="mb-2 font-medium">
            Copy this now — it won&apos;t be shown again:
          </p>
          <code className="break-all">{newRawKey}</code>
        </div>
      )}

      <form onSubmit={handleGenerate} className="flex gap-2">
        <input
          type="text"
          placeholder="Label (e.g. Claude Code)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          Generate
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="flex flex-col gap-2">
        {keys.map((k) => (
          <li
            key={k.id}
            className="flex items-center justify-between rounded border px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium">{k.label || "(unlabeled)"}</p>
              <p className="text-neutral-500">
                created {new Date(k.created_at).toLocaleDateString()} · last used{" "}
                {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "never"}
              </p>
            </div>
            <button
              onClick={() => handleRevoke(k.id)}
              className="text-red-600 hover:underline"
            >
              Revoke
            </button>
          </li>
        ))}
        {keys.length === 0 && <p className="text-sm text-neutral-500">No keys yet.</p>}
      </ul>
    </main>
  );
}
