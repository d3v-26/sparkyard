"use client";

import { useActionState } from "react";
import {
  deleteUser,
  inviteUser,
  resendLink,
  revokeUserKeys,
  type AdminState,
} from "./actions";

function LinkBox({ state }: { state: AdminState }) {
  if (!state) return null;
  if (state.error) return <p className="text-sm text-accent">{state.error}</p>;
  if (state.message) return <p className="font-mono text-xs text-ink-dim">{state.message}</p>;
  if (!state.link) return null;
  return (
    <div className="border border-accent px-4 py-3 text-sm">
      <p className="mb-2 font-medium">Send this link — it won&apos;t be shown again:</p>
      <code className="break-all font-mono text-xs text-accent">{state.link}</code>
    </div>
  );
}

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteUser, null);
  return (
    <div className="flex flex-col gap-3">
      <form action={action} className="flex flex-wrap gap-2 border-b border-line pb-6">
        <input
          name="email"
          type="email"
          required
          placeholder="friend@example.com"
          className="min-w-0 flex-1 border-b border-line bg-transparent py-2 outline-none placeholder:text-ink-dim focus:border-accent"
        />
        <input
          name="display_name"
          type="text"
          placeholder="Display name"
          className="min-w-0 flex-1 border-b border-line bg-transparent py-2 outline-none placeholder:text-ink-dim focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink disabled:opacity-50"
        >
          Generate link
        </button>
      </form>
      <LinkBox state={state} />
    </div>
  );
}

export function UserActions({
  userId,
  email,
  isSelf,
  keyCount,
}: {
  userId: string;
  email: string;
  isSelf: boolean;
  keyCount: number;
}) {
  const [linkState, linkAction, linkPending] = useActionState(resendLink, null);
  const [keyState, keyAction, keyPending] = useActionState(revokeUserKeys, null);
  const [delState, delAction, delPending] = useActionState(deleteUser, null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-4 font-mono text-xs">
        <form action={linkAction}>
          <input type="hidden" name="email" value={email} />
          <button disabled={linkPending} className="text-accent hover:underline">
            new link
          </button>
        </form>
        {keyCount > 0 && (
          <form
            action={keyAction}
            onSubmit={(e) => {
              if (!confirm(`Revoke all ${keyCount} API key(s) for ${email}?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="user_id" value={userId} />
            <button disabled={keyPending} className="text-accent hover:underline">
              revoke keys
            </button>
          </form>
        )}
        {!isSelf && (
          <form
            action={delAction}
            onSubmit={(e) => {
              if (!confirm(`Delete ${email}? Their ideas and comments stay, unattributed.`))
                e.preventDefault();
            }}
          >
            <input type="hidden" name="user_id" value={userId} />
            <button disabled={delPending} className="text-accent hover:underline">
              delete
            </button>
          </form>
        )}
      </div>
      <LinkBox state={linkState} />
      <LinkBox state={keyState} />
      <LinkBox state={delState} />
    </div>
  );
}
