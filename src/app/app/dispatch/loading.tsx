export default function DispatchLoading() {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="h-8 w-64 max-w-full animate-pulse rounded-md bg-line/70" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded-md bg-line/50" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-xl border border-line bg-surface/80"
          />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-xl border border-line bg-surface/80" />
      <div className="h-64 animate-pulse rounded-xl border border-line bg-surface/80" />
      <span className="sr-only">Loading dispatch queue…</span>
    </section>
  );
}
