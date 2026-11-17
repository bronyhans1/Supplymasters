/**
 * Money helpers for purchase costs (numeric(14,2) / GH₵).
 * Prefer integer minor-units math to avoid float drift.
 */

const SCALE = 100;

export function toMinorUnits(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Invalid money value.");
  }
  return Math.round(value * SCALE);
}

export function fromMinorUnits(minor: number): number {
  return minor / SCALE;
}

/** Round to two decimal places using minor units. */
export function roundMoney(value: number): number {
  return fromMinorUnits(toMinorUnits(value));
}

/** Matches DB: round(quantity_boxes * unit_purchase_cost, 2). */
export function lineTotal(quantity: number, unitCost: number): number {
  if (!Number.isInteger(quantity)) {
    throw new Error("Quantity must be a whole number.");
  }
  return fromMinorUnits(quantity * toMinorUnits(unitCost));
}

export function sumLineTotals(
  lines: ReadonlyArray<{ quantity: number; unitCost: number }>,
): number {
  const minor = lines.reduce(
    (sum, line) => sum + toMinorUnits(lineTotal(line.quantity, line.unitCost)),
    0,
  );
  return fromMinorUnits(minor);
}

export function formatGhs(value: number): string {
  const amount = roundMoney(value);
  const formatted = new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    currencyDisplay: "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return formatted.replace(/GHS\s?/i, "GH₵ ").replace(/\u00a0/g, " ").trim();
}

/** Parse user input into a money amount (2 dp). Returns null if invalid. */
export function parseMoneyInput(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return roundMoney(raw);
  }
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/,/g, "");
  if (!trimmed) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return roundMoney(Number(trimmed));
}
