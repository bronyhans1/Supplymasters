import type { PaymentMethod } from "@/types/database";
import { fromMinorUnits, toMinorUnits } from "@/lib/supplies/money";
import { PAYMENT_METHODS } from "./schemas";

export type PaymentAmountRow = {
  amount: number;
  payment_method: PaymentMethod;
};

export type PaymentMethodBreakdown = {
  method: PaymentMethod;
  count: number;
  amount: number;
};

export type PaymentAggregate = {
  count: number;
  totalAmount: number;
  byMethod: PaymentMethodBreakdown[];
};

/**
 * Aggregate payment amounts using integer minor units to avoid float drift.
 * Each row contributes once — callers must not pass duplicate payment rows.
 */
export function aggregatePaymentAmounts(
  rows: readonly PaymentAmountRow[],
): PaymentAggregate {
  let totalMinor = 0;
  const methodMap = new Map<PaymentMethod, { count: number; minor: number }>();

  for (const row of rows) {
    const minor = toMinorUnits(Number(row.amount));
    totalMinor += minor;
    const existing = methodMap.get(row.payment_method) ?? { count: 0, minor: 0 };
    existing.count += 1;
    existing.minor += minor;
    methodMap.set(row.payment_method, existing);
  }

  const byMethod: PaymentMethodBreakdown[] = PAYMENT_METHODS.map((method) => {
    const entry = methodMap.get(method);
    return {
      method,
      count: entry?.count ?? 0,
      amount: fromMinorUnits(entry?.minor ?? 0),
    };
  }).filter((entry) => entry.count > 0);

  return {
    count: rows.length,
    totalAmount: fromMinorUnits(totalMinor),
    byMethod,
  };
}
