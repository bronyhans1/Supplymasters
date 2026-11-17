"use client";

export function PrintSupplyButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink hover:bg-paper print:hidden"
    >
      Print
    </button>
  );
}
