import Image from "next/image";
import { APP_LOGO_PATH, APP_NAME, APP_TAGLINE } from "@/config/brand";
import { cn } from "@/lib/utils/cn";

/** Intrinsic public/logo.png proportions (optimized source retains 3:2). */
export const LOGO_ASPECT_RATIO = 768 / 512;

/**
 * Official SUPPLY MASTERS mark from /public/logo.png.
 * Height drives sizing; width follows the landscape aspect ratio.
 */
export function BrandMark({
  height = 40,
  /** @deprecated Prefer `height`. Treated as logo height for compatibility. */
  size,
  className,
  priority = false,
}: {
  height?: number;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const logoHeight = size ?? height;
  const logoWidth = Math.round(logoHeight * LOGO_ASPECT_RATIO);

  return (
    <Image
      src={APP_LOGO_PATH}
      alt={APP_NAME}
      width={logoWidth}
      height={logoHeight}
      priority={priority}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: logoWidth, height: logoHeight }}
    />
  );
}

/**
 * Logo left + wordmark right, with tagline centered under the company name.
 *
 * The wordmark stays on one horizontal line (`whitespace-nowrap`). The text
 * column uses `shrink-0` so a parent `min-w-0` flex item cannot squeeze
 * "SUPPLY MASTERS" onto two lines.
 */
export function BrandLockup({
  height = 40,
  /** @deprecated Prefer `height`. Treated as logo height for compatibility. */
  size,
  className,
  nameClassName,
  taglineClassName,
  showTagline = true,
  priority = false,
}: {
  height?: number;
  size?: number;
  className?: string;
  nameClassName?: string;
  taglineClassName?: string;
  showTagline?: boolean;
  priority?: boolean;
}) {
  const logoHeight = size ?? height;

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark height={logoHeight} priority={priority} />
      <span className="shrink-0">
        <span
          className={cn(
            "block whitespace-nowrap font-sans text-[0.95rem] font-bold leading-tight tracking-[0.02em] text-ink sm:text-base",
            nameClassName,
          )}
        >
          {APP_NAME}
        </span>
        {showTagline ? (
          <span
            className={cn(
              "mt-0.5 block whitespace-nowrap text-center text-[10px] font-medium leading-tight tracking-[0.04em] text-muted",
              taglineClassName,
            )}
          >
            {APP_TAGLINE}
          </span>
        ) : null}
      </span>
    </span>
  );
}
