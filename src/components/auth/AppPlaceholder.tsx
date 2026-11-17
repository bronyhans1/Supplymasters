import type { Profile } from "@/types/profile";

export function AppPlaceholder({
  title,
  description,
  profile,
}: {
  title: string;
  description: string;
  profile: Profile;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
          {profile.role}
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-tight text-ink">{title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">{description}</p>
      </div>

      <div className="rounded-xl border border-line bg-white/70 p-6">
        <p className="text-sm text-ink">
          Signed in as <span className="font-medium">{profile.full_name}</span>
        </p>
        <p className="mt-1 text-sm text-muted">{profile.email}</p>
        <p className="mt-4 text-sm leading-6 text-muted">
          Business workflows for inventory, supplies, payments, and deliveries will be
          added in later phases. This area confirms role-aware access only.
        </p>
      </div>
    </div>
  );
}
