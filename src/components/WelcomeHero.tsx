import Link from "next/link";
import { APP_HEADLINE, APP_WELCOME_BODY } from "@/config/brand";
import { DistributionVisual } from "@/components/marketing/DistributionVisual";

export function WelcomeHero() {
  return (
    <section className="relative flex flex-1 flex-col justify-center overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_color-mix(in_srgb,var(--color-accent)_12%,transparent),_transparent_55%),linear-gradient(180deg,_color-mix(in_srgb,var(--color-ink)_3%,transparent),_transparent_42%)]"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-14 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14 lg:py-20">
        <div className="max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Wholesale distribution platform
          </p>

          <h1 className="mt-4 font-sans text-[2.15rem] font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.15rem]">
            {APP_HEADLINE}
          </h1>

          <p className="mt-5 max-w-lg text-base leading-7 text-muted sm:text-lg sm:leading-8">
            {APP_WELCOME_BODY}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-paper transition hover:bg-ink/90"
            >
              Staff Sign In
            </Link>
            <p className="max-w-xs text-sm leading-6 text-muted">
              Accounts are created by administrators. Public registration is not available.
            </p>
          </div>

          <dl className="mt-10 grid grid-cols-1 gap-4 border-t border-line pt-6 text-center sm:grid-cols-3 sm:gap-5 sm:text-left">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                Product Catalog
              </dt>
              <dd className="mt-1 text-sm font-semibold text-ink">Products</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                Stock Management
              </dt>
              <dd className="mt-1 text-sm font-semibold text-ink">Inventory</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                Distribution Operations
              </dt>
              <dd className="mt-1 text-sm font-semibold text-ink">Deliveries</dd>
            </div>
          </dl>
        </div>

        <div className="lg:pl-2">
          <DistributionVisual />
        </div>
      </div>
    </section>
  );
}
