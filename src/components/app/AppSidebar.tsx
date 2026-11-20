"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  Store,
  Truck,
  ShoppingCart,
  Warehouse,
  ClipboardList,
  Banknote,
  PackageCheck,
  Route,
  UserCog,
  Undo2,
  Users,
  IdCard,
  BarChart3,
  Tags,
  History,
  Menu,
  X,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandMark";
import { useNavigationProgress } from "@/components/navigation/NavigationProgress";
import {
  buildAppNav,
  isNavItemActive,
  type NavItem,
} from "@/lib/navigation/app-nav";
import type { Profile } from "@/types/profile";
import { cn } from "@/lib/utils/cn";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { describeRole } from "@/lib/admin/users/authorization";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  dashboard: LayoutDashboard,
  products: Boxes,
  categories: Tags,
  vendors: Store,
  suppliers: Truck,
  drivers: IdCard,
  purchasing: ShoppingCart,
  inventory: Warehouse,
  supplies: ClipboardList,
  payments: Banknote,
  deliveries: PackageCheck,
  dispatch: Route,
  assignments: UserCog,
  returns: Undo2,
  users: Users,
  reports: BarChart3,
  "audit-logs": History,
};

/** Persistent sidebar from xl (1280px); phones and tablets use the drawer. */
const DESKTOP_NAV = "xl";

export function AppSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const sections = buildAppNav(profile.role);
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerTitleId = useId();

  // Escape, body scroll lock, and history traversal while the drawer is open.
  // Route changes close via NavLink onNavigate (avoids setState-in-effect on pathname).
  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    function onPopState() {
      setMobileOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", onPopState);
    };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-30 flex w-full shrink-0 items-center justify-between gap-3 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur-sm xl:hidden",
          "pt-[max(0.75rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]",
        )}
      >
        <Link
          href={sections[0]?.items[0]?.href ?? "/app"}
          className="min-w-0"
          onClick={() => setMobileOpen(false)}
        >
          {/* Mobile LCP mark — sole AppSidebar priority (drawer/desktop omit). */}
          <BrandLockup height={32} priority />
        </Link>
        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
          aria-controls="app-mobile-nav"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-line text-ink hover:bg-white outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={20} aria-hidden />
        </button>
      </header>

      {/*
        Keep the drawer mounted so the brand image does not remount/flicker,
        and animate open/close with transform + backdrop opacity.
      */}
      <div
        id="app-mobile-nav"
        className={cn(
          "fixed inset-0 z-40 xl:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          tabIndex={mobileOpen ? 0 : -1}
          aria-label="Close navigation overlay"
          className={cn(
            "absolute inset-0 bg-ink/40 transition-opacity duration-200 ease-out motion-reduce:transition-none",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          role="dialog"
          aria-modal={mobileOpen}
          aria-labelledby={drawerTitleId}
          inert={!mobileOpen ? true : undefined}
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(20rem,calc(100vw-2.5rem))] max-w-full flex-col border-r border-line bg-paper shadow-xl",
            "pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]",
            "transition-transform duration-200 ease-out will-change-transform motion-reduce:transition-none",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div id={drawerTitleId} className="min-w-0">
              <BrandLockup height={32} />
            </div>
            <button
              type="button"
              tabIndex={mobileOpen ? 0 : -1}
              aria-label="Close navigation"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-line hover:bg-white outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              onClick={() => setMobileOpen(false)}
            >
              <X size={18} aria-hidden />
            </button>
          </div>
          <NavBody
            sections={sections}
            pathname={pathname}
            profile={profile}
            touchFriendly
            onNavigate={() => setMobileOpen(false)}
          />
        </aside>
      </div>

      <aside
        className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-paper xl:flex"
        data-desktop-nav={DESKTOP_NAV}
      >
        <div className="border-b border-line px-3 py-3.5">
          <Link href={sections[0]?.items[0]?.href ?? "/app"}>
            <BrandLockup
              height={32}
              nameClassName="text-[0.9rem] tracking-[0.01em]"
            />
          </Link>
        </div>
        <NavBody
          sections={sections}
          pathname={pathname}
          profile={profile}
        />
      </aside>
    </>
  );
}

function NavBody({
  sections,
  pathname,
  profile,
  onNavigate,
  touchFriendly = false,
}: {
  sections: ReturnType<typeof buildAppNav>;
  pathname: string;
  profile: Profile;
  onNavigate?: () => void;
  touchFriendly?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav
        className={cn(
          "flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4",
          touchFriendly && "space-y-6",
        )}
        aria-label="Application"
      >
        {sections.map((section) => (
          <div key={section.id}>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              {section.label}
            </p>
            <ul className={cn("space-y-1", touchFriendly && "space-y-1.5")}>
              {section.items.map((item) => (
                <li key={item.id}>
                  <NavLink
                    item={item}
                    pathname={pathname}
                    touchFriendly={touchFriendly}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <div className="mb-3 rounded-lg border border-line bg-white/70 px-3 py-2">
          <p className="truncate text-sm font-medium text-ink">{profile.full_name}</p>
          <p className="truncate text-xs text-muted">{profile.email}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-muted">
            {describeRole(profile.role)}
          </p>
        </div>
        <SignOutButton
          className={cn("w-full", touchFriendly && "min-h-11 py-2.5")}
        />
      </div>
    </div>
  );
}

function NavLink({
  item,
  pathname,
  touchFriendly,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  touchFriendly?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = ICONS[item.id] ?? LayoutDashboard;
  const active = isNavItemActive(pathname, item.href);
  const { begin } = useNavigationProgress();

  if (!item.available || !item.href) {
    return (
      <span
        className={cn(
          "flex cursor-not-allowed items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted/70",
          touchFriendly && "min-h-11 py-3",
        )}
      >
        <Icon size={touchFriendly ? 18 : 16} className="shrink-0 opacity-60" />
        <span className="flex-1 truncate">{item.label}</span>
        <span className="rounded bg-line/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
          Soon
        </span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onNavigate={(event) => {
        // Always close the mobile drawer when a nav control is activated.
        onNavigate?.();
        // Current route: no pending chrome / progress bar.
        if (active) {
          event.preventDefault();
          return;
        }
        begin();
      }}
      className={cn(
        "relative flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition",
        touchFriendly && "min-h-11 gap-3 py-3 text-[0.95rem]",
        active ? "bg-ink text-paper" : "text-ink hover:bg-white",
      )}
      aria-current={active ? "page" : undefined}
    >
      <NavLinkPending
        active={active}
        touchFriendly={touchFriendly}
        label={item.label}
        Icon={Icon}
      />
    </Link>
  );
}

function NavLinkPending({
  active,
  touchFriendly,
  label,
  Icon,
}: {
  active: boolean;
  touchFriendly?: boolean;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const { pending } = useLinkStatus();
  const showPending = pending && !active;

  return (
    <>
      <Icon
        size={touchFriendly ? 18 : 16}
        className={cn("shrink-0", showPending && "opacity-70")}
      />
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate">{label}</span>
        <span
          className={cn(
            "ml-auto size-1.5 shrink-0 rounded-full bg-accent transition-opacity",
            showPending
              ? "animate-pulse opacity-100 motion-reduce:animate-none"
              : "opacity-0",
          )}
          aria-hidden={!showPending}
        />
      </span>
      <span className="sr-only" aria-live="polite">
        {showPending ? `Navigating to ${label}` : ""}
      </span>
    </>
  );
}
