import { APP_NAME, APP_TAGLINE } from "@/config/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-1.5 px-6 py-5 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:text-left">
        <p className="text-sm text-muted">© 2026 {APP_NAME}</p>
        <p className="text-xs font-medium tracking-[0.04em] text-muted sm:text-right">
          {APP_TAGLINE}
        </p>
      </div>
    </footer>
  );
}
