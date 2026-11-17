import type { PaymentMethod, PaymentStatus } from "@/types/database";

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

export function paymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case "PAID":
      return "Paid";
    case "UNPAID":
      return "Unpaid";
    default:
      return status;
  }
}
