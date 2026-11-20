export default function DispatchDetailLoading() {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="h-4 w-40 animate-pulse rounded-md bg-line/50" />
        <div className="h-8 w-72 max-w-full animate-pulse rounded-md bg-line/70" />
        <div className="h-4 w-full max-w-lg animate-pulse rounded-md bg-line/50" />
      </div>
      <div className="h-40 animate-pulse rounded-xl border border-line bg-surface/80" />
      <div className="h-48 animate-pulse rounded-xl border border-line bg-surface/80" />
      <span className="sr-only">Loading dispatch desk…</span>
    </section>
  );
}
