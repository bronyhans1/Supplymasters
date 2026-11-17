"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export function CopyableReference({
  value,
  label = "Internal reference",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-md border border-line bg-paper px-2 py-1 text-xs text-ink">
          {value}
        </code>
        <button
          type="button"
          className={cn(
            "rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink",
            "transition hover:bg-paper",
          )}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-xs text-muted">
        Support reference only — not needed for day-to-day account management.
      </p>
    </div>
  );
}
