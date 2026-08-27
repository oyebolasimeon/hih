import mongoose from "mongoose";
import { Payment } from "@/models/Payment";
import { RentLock } from "@/models/RentLock";
import type { LeasePaymentPeriod } from "@/models/Lease";

export type RentPeriodInput = {
  startDate: Date | string;
  endDate?: Date | string | null;
  paymentPeriod: LeasePaymentPeriod;
};

export type RentPeriodBounds = {
  periodIndex: number;
  periodStart: Date;
  periodEnd: Date;
};

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addYears(date: Date, years: number): Date {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

export function getRentPeriodBounds(
  lease: RentPeriodInput,
  periodIndex: number
): RentPeriodBounds {
  const start = toDate(lease.startDate);

  if (lease.paymentPeriod === "term") {
    return {
      periodIndex: 0,
      periodStart: start,
      periodEnd: lease.endDate ? toDate(lease.endDate) : addMonths(start, 4),
    };
  }

  if (lease.paymentPeriod === "yearly") {
    return {
      periodIndex,
      periodStart: addYears(start, periodIndex),
      periodEnd: addYears(start, periodIndex + 1),
    };
  }

  return {
    periodIndex,
    periodStart: addMonths(start, periodIndex),
    periodEnd: addMonths(start, periodIndex + 1),
  };
}

export function getRentPeriodAt(
  lease: RentPeriodInput,
  at: Date = new Date()
): RentPeriodBounds {
  if (lease.paymentPeriod === "term") {
    return getRentPeriodBounds(lease, 0);
  }

  for (let idx = 0; idx < 600; idx += 1) {
    const bounds = getRentPeriodBounds(lease, idx);
    if (at >= bounds.periodStart && at < bounds.periodEnd) {
      return bounds;
    }
    if (at < bounds.periodStart) {
      return bounds;
    }
  }

  return getRentPeriodBounds(lease, 599);
}

export function isPeriodExpired(periodEnd: Date, at: Date = new Date()) {
  return at >= periodEnd;
}

export function formatRentPeriodLabel(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return `${start.toLocaleDateString("en-NG", opts)} – ${end.toLocaleDateString("en-NG", opts)}`;
}

export async function isRentPeriodPaid(
  leaseId: mongoose.Types.ObjectId | string,
  periodIndex: number
) {
  const paidViaPayment = await Payment.exists({
    leaseId,
    purpose: "rent",
    status: "successful",
    rentPeriodIndex: periodIndex,
  });
  if (paidViaPayment) return true;

  const paidViaLock = await RentLock.exists({
    leaseId,
    rentPeriodIndex: periodIndex,
    status: "applied",
  });
  return Boolean(paidViaLock);
}

export async function getPayableRentPeriod(
  lease: RentPeriodInput & { _id: mongoose.Types.ObjectId | string }
) {
  const now = new Date();
  let index = getRentPeriodAt(lease, now).periodIndex;

  for (let guard = 0; guard < 600; guard += 1) {
    const bounds = getRentPeriodBounds(lease, index);
    const paid = await isRentPeriodPaid(lease._id, index);
    if (!paid) {
      return { ...bounds, paid: false, expired: isPeriodExpired(bounds.periodEnd, now) };
    }
    index += 1;
  }

  const fallback = getRentPeriodBounds(lease, index);
  return { ...fallback, paid: true, expired: false };
}

export async function getNextRentPeriodAfterPaid(
  lease: RentPeriodInput & { _id: mongoose.Types.ObjectId | string }
) {
  const payable = await getPayableRentPeriod(lease);
  if (!payable.paid) {
    throw new Error("Pay or settle the current rent period first.");
  }
  return getRentPeriodBounds(lease, payable.periodIndex + 1);
}
