import Link from "next/link";
import { BrandLockup } from "@/components/brand/BrandMark";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-1 items-center justify-center px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_color-mix(in_srgb,var(--color-accent)_12%,transparent),_transparent_42%),linear-gradient(180deg,_color-mix(in_srgb,var(--color-ink)_3%,transparent),_transparent_40%)]"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center text-center">
          <Link href="/" className="inline-flex">
            <BrandLockup
              height={44}
              priority
              nameClassName="text-xl sm:text-2xl"
              taglineClassName="text-xs"
            />
          </Link>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6 shadow-[0_20px_60px_color-mix(in_srgb,var(--color-ink)_8%,transparent)]">
          <div className="mb-6">
            <h1 className="font-sans text-2xl font-bold tracking-tight text-ink">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
