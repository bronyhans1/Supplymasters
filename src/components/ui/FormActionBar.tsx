import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Sticky page-level action bar for long operational forms (purchase/supply/return).
 * Keeps primary actions reachable above the home indicator on phones.
 */
export function FormActionBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 -mx-1 border-t border-line bg-paper/95 px-1 pt-3",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm",
        "supports-[backdrop-filter]:bg-paper/85",
        className,
      )}
    >
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {children}
      </div>
    </div>
  );
}
