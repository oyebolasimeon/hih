import { randomBytes } from "crypto";

export function generateReceiptNumber() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `RCP-${y}${m}${d}-${suffix}`;
}

export function generateWalletTxReference(prefix: string) {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}

export function generateWithdrawalReference() {
  return `wdr_${randomBytes(12).toString("hex")}`;
}

export function maskAccountNumber(accountNumber: string) {
  const digits = accountNumber.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `****${digits.slice(-4)}`;
}

export function withdrawalMinAmount() {
  return Number(process.env.WITHDRAWAL_MIN_AMOUNT || "1000");
}

export function withdrawalFee() {
  return Number(process.env.WITHDRAWAL_FEE || "0");
}
