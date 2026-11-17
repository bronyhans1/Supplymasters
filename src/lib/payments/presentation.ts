import type { PaymentMethod } from "@/types/database";
import { PAYMENT_METHODS } from "./schemas";

export function paymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case "CASH":
      return "Cash";
    case "MOBILE_MONEY":
      return "Mobile money";
    case "BANK_TRANSFER":
      return "Bank transfer";
    case "CHEQUE":
      return "Cheque";
    case "OTHER":
      return "Other";
    default:
      return method;
  }
}

export function paymentMethodBadgeClass(method: PaymentMethod): string {
  switch (method) {
    case "CASH":
      return "bg-good/10 text-good";
    case "MOBILE_MONEY":
      return "bg-ink/10 text-ink";
    case "BANK_TRANSFER":
      return "bg-accent/10 text-accent";
    case "CHEQUE":
    case "OTHER":
    default:
      return "bg-line/60 text-muted";
  }
}

export function formatPaymentDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
      new Date(`${value}T00:00:00Z`),
    );
  } catch {
    return value;
  }
}

export function formatPaymentDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

/** Calendar date in Africa/Accra as YYYY-MM-DD. */
export function ghanaCalendarDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Accra",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function filterPaymentMethodOptions(): {
  value: "" | PaymentMethod;
  label: string;
}[] {
  return [
    { value: "", label: "All methods" },
    ...PAYMENT_METHODS.map((method) => ({
      value: method,
      label: paymentMethodLabel(method),
    })),
  ];
}

export function parsePaymentMethodFilter(value: string): PaymentMethod | "" {
  if (!value) return "";
  return (PAYMENT_METHODS as readonly string[]).includes(value)
    ? (value as PaymentMethod)
    : "";
}
