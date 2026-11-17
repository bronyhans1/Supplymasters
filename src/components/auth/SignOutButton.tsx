"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/utils/cn";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      onClick={() => {
        if (pending) return;
        startTransition(async () => {
          const result = await signOut();
          router.replace(result.ok ? result.redirectTo : "/sign-in");
          router.refresh();
        });
      }}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink transition hover:bg-paper",
        "outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {pending ? (
        <span
          aria-hidden="true"
          className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-line border-t-ink motion-reduce:animate-none"
        />
      ) : (
        <LogOut aria-hidden="true" size={16} className="shrink-0" strokeWidth={1.75} />
      )}
      <span>{pending ? "Signing out…" : "Sign out"}</span>
    </button>
  );
}
