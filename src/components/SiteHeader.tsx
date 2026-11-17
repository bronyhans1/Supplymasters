import Link from "next/link";
import { AuthNav } from "@/components/AuthNav";
import { BrandLockup } from "@/components/brand/BrandMark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/90 bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-6 sm:py-3.5">
        <Link href="/" className="min-w-0" aria-label="SUPPLY MASTERS home">
          <BrandLockup
            height={44}
            priority
            className="gap-3"
            nameClassName="text-[0.95rem] font-bold tracking-[0.03em] sm:text-base"
            taglineClassName="text-[10px] tracking-[0.05em] sm:text-[11px]"
          />
        </Link>
        <div className="shrink-0">
          <AuthNav />
        </div>
      </div>
    </header>
  );
}
