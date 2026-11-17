import { Suspense } from "react";
import { AppSidebar } from "@/components/app/AppSidebar";
import { NavigationProgressProvider } from "@/components/navigation/NavigationProgress";
import type { Profile } from "@/types/profile";

/**
 * Application chrome for /app routes.
 *
 * Mobile & tablet (< xl / 1280px): column layout — sticky top bar + full-width main;
 * navigation uses the existing drawer (not a squeezed side column).
 * Desktop (xl+): row layout — persistent sidebar + main.
 */
export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <NavigationProgressProvider>
        <div className="flex min-h-screen flex-col bg-paper text-ink xl:flex-row">
          <AppSidebar profile={profile} />
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="w-full min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 xl:px-8">
              {children}
            </main>
          </div>
        </div>
      </NavigationProgressProvider>
    </Suspense>
  );
}
