/**
 * Decorative wholesale-distribution composition for the public hero.
 * CSS-only — no illustration libraries or external imagery.
 */
export function DistributionVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-[5/4] w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-ink shadow-[0_24px_60px_color-mix(in_srgb,var(--color-ink)_18%,transparent)] lg:max-w-none"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,_color-mix(in_srgb,var(--color-accent)_34%,transparent),_transparent_42%),radial-gradient(circle_at_82%_78%,_color-mix(in_srgb,var(--color-accent)_18%,transparent),_transparent_46%),linear-gradient(160deg,_#273541_0%,_var(--color-ink)_55%,_#171e24_100%)]" />
      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:28px_28px]" />

      {/* Warehouse bay */}
      <div className="absolute left-[8%] top-[14%] h-[58%] w-[38%] rounded-lg border border-white/15 bg-white/[0.06] p-3 backdrop-blur-[1px]">
        <div className="mb-2 h-1.5 w-1/2 rounded-full bg-accent/80" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, index) => (
            <div
              key={index}
              className="aspect-square rounded-sm border border-white/10 bg-gradient-to-br from-white/20 to-white/5"
            />
          ))}
        </div>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
          Inventory
        </p>
      </div>

      {/* Carton stack */}
      <div className="absolute bottom-[12%] left-[18%] flex w-[28%] flex-col gap-1.5">
        <div className="h-8 rounded-md border border-accent/40 bg-accent/85 shadow-lg" />
        <div className="ml-2 h-8 rounded-md border border-accent/30 bg-accent/65" />
        <div className="ml-4 h-8 rounded-md border border-white/20 bg-white/20" />
      </div>

      {/* Delivery route card */}
      <div className="absolute right-[8%] top-[18%] w-[42%] rounded-xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-[1px]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            Dispatch
          </p>
          <span className="rounded-full bg-good/20 px-2 py-0.5 text-[10px] font-medium text-[#9BE2BC]">
            On route
          </span>
        </div>
        <div className="mt-4 space-y-2.5">
          <div className="h-2 w-full rounded-full bg-white/10">
            <div className="h-2 w-[72%] rounded-full bg-accent" />
          </div>
          <div className="flex justify-between text-[11px] text-white/70">
            <span>Warehouse</span>
            <span>Vendor</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-white/80">
          <div className="rounded-lg bg-white/5 px-2.5 py-2">
            <p className="text-white/45">Supplies</p>
            <p className="mt-1 font-semibold text-white">Today</p>
          </div>
          <div className="rounded-lg bg-white/5 px-2.5 py-2">
            <p className="text-white/45">Stock</p>
            <p className="mt-1 font-semibold text-white">Tracked</p>
          </div>
        </div>
      </div>

      {/* Logistics arc */}
      <svg
        className="absolute inset-x-[12%] bottom-[8%] h-16 w-[76%] text-accent/70"
        viewBox="0 0 320 64"
        fill="none"
      >
        <path
          d="M8 48 C 80 8, 240 8, 312 48"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6 8"
        />
        <circle cx="8" cy="48" r="4" fill="currentColor" />
        <circle cx="312" cy="48" r="4" fill="currentColor" />
      </svg>
    </div>
  );
}
