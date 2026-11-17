import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import {
  APP_NAME,
  APP_POWERED_BY,
  APP_TAGLINE,
  APP_VERSION,
} from "@/config/brand";
import { cn } from "@/lib/utils/cn";

const FEATURES = [
  "Inventory & stock management.",
  "Wholesale supply operations.",
  "Deliveries & operational reporting.",
] as const;

function SignInBrandLockup({
  logoHeight,
  className,
  nameClassName,
  taglineClassName,
}: {
  logoHeight: number;
  className?: string;
  nameClassName?: string;
  taglineClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <BrandMark height={logoHeight} priority />
      <span className="min-w-0">
        <span
          className={cn(
            "block whitespace-nowrap font-sans font-bold leading-none tracking-[0.03em] text-paper",
            nameClassName,
          )}
        >
          {APP_NAME}
        </span>
        <span
          className={cn(
            "mt-1 block font-medium leading-tight tracking-[0.05em] text-[#AEB8C0]",
            taglineClassName,
          )}
        >
          {APP_TAGLINE}
        </span>
      </span>
    </span>
  );
}

export function SignInExperience({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel — ~45% on desktop */}
      <aside className="relative overflow-hidden bg-ink text-paper lg:flex lg:w-[45%] lg:flex-col lg:justify-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_15%,_color-mix(in_srgb,var(--color-accent)_28%,transparent),_transparent_48%),radial-gradient(ellipse_at_85%_90%,_color-mix(in_srgb,var(--color-accent)_14%,transparent),_transparent_42%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:32px_32px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 top-1/4 hidden h-64 w-64 rounded-full border border-accent/25 lg:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 top-[38%] hidden h-40 w-40 rounded-full border border-white/10 lg:block"
        />

        {/* Mobile compact brand header — centered lockup group only */}
        <div className="relative flex justify-center border-b border-white/10 px-5 py-4 lg:hidden">
          <Link href="/" className="inline-flex" aria-label={`${APP_NAME} home`}>
            <SignInBrandLockup
              logoHeight={38}
              nameClassName="text-[0.95rem]"
              taglineClassName="text-[10px]"
            />
          </Link>
        </div>

        {/* Desktop brand content — hidden on mobile */}
        <div className="relative mx-auto hidden w-full max-w-lg px-6 py-8 sm:px-8 lg:block lg:max-w-xl lg:px-10 lg:py-16 xl:px-12">
          <Link
            href="/"
            className="mb-9 inline-flex"
            aria-label={`${APP_NAME} home`}
          >
            <SignInBrandLockup
              logoHeight={76}
              className="gap-3.5"
              nameClassName="text-[1.4rem] xl:text-[1.6rem]"
              taglineClassName="text-[11px] xl:text-xs"
            />
          </Link>

          <h1 className="font-sans text-[1.5rem] font-bold leading-[1.22] tracking-tight text-paper sm:text-[1.75rem] lg:text-[1.9rem] xl:text-[2.05rem]">
            Your distribution operations,
            <br />
            all in one place.
          </h1>

          <p className="mt-4 max-w-md text-sm leading-6 text-[#AEB8C0] sm:mt-5 sm:text-[0.95rem] sm:leading-7">
            Manage products, purchasing, inventory, wholesale supplies, payments
            and deliveries through one connected platform.
          </p>

          <ul className="mt-6 space-y-2.5 sm:mt-8 sm:space-y-3.5 lg:mt-10">
            {FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 text-[0.8125rem] text-paper/90 sm:text-sm"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent"
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Form panel — ~55% on desktop */}
      <section className="relative flex flex-1 flex-col justify-center bg-paper px-6 py-10 sm:px-10 lg:w-[55%] lg:px-14 lg:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_color-mix(in_srgb,var(--color-accent)_8%,transparent),_transparent_45%)]"
        />

        <div className="relative mx-auto w-full max-w-md">
          <div className="mb-8 text-center">
            <h2 className="font-sans text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">
              Welcome back
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted sm:text-[0.95rem]">
              Sign in to access your {APP_NAME} workspace.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-6 shadow-[0_18px_50px_color-mix(in_srgb,var(--color-ink)_7%,transparent)] sm:p-8">
            {children}
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-muted">
            <span className="block tabular-nums tracking-wide">{APP_VERSION}</span>
            <span className="mt-1 block">{APP_POWERED_BY}</span>
          </p>
        </div>
      </section>
    </div>
  );
}
