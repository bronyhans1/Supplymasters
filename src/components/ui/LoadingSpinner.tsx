import { cn } from "@/lib/utils/cn";

export function LoadingSpinner({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center gap-2 text-sm text-muted", className)}
    >
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
