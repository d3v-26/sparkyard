import Link from "next/link";
import { isAdminEmail } from "@/lib/admin";
import { SignOutButton } from "./SignOutButton";

export function Nav({ email }: { email: string | null }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Sparkyard
        </Link>
        <nav className="flex items-center gap-4 font-mono text-xs">
          <Link href="/settings/api-keys" className="text-ink-dim hover:text-ink">
            api keys
          </Link>
          {isAdminEmail(email) && (
            <Link href="/admin" className="text-ink-dim hover:text-ink">
              admin
            </Link>
          )}
          {email && <span className="text-ink-dim">{email}</span>}
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
