export default function RecordPaymentLoading() {
  return (
    <section className="mx-auto w-full max-w-3xl space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="h-4 w-40 animate-pulse rounded-md bg-line/50" />
        <div className="h-8 w-64 max-w-full animate-pulse rounded-md bg-line/70" />
        <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-line/50" />
      </div>
      <div className="h-40 animate-pulse rounded-xl border border-line bg-surface/80" />
      <div className="h-64 animate-pulse rounded-xl border border-line bg-surface/80" />
      <span className="sr-only">Loading payment form…</span>
    </section>
  );
}