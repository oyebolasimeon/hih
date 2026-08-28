import { notifyUser } from "@/lib/profile-context";
import { sendPaymentReceiptEmail } from "@/lib/receipt-email";
import { settleAgreementFeePayment } from "@/lib/platform-wallet";
import { creditWalletDeposit, settleRentPaymentWallets, settleServiceDuePayment } from "@/lib/wallet";
import { generateReceiptNumber } from "@/lib/wallet-utils";
import { Payment } from "@/models/Payment";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";

export async function markPaymentSuccessful(
  payment: InstanceType<typeof Payment>
) {
  if (payment.status === "successful") {
    if (payment.purpose === "wallet_deposit" && !payment.tenantWalletTxId) {
      await creditWalletDeposit(payment);
    } else if (payment.purpose === "agreement_fee" && !payment.landlordWalletTxId && !payment.platformProfileId) {
      await settleAgreementFeePayment(payment);
    } else if (
      payment.purpose === "rent" &&
      !payment.landlordWalletTxId &&
      payment.payeeProfileId
    ) {
      await settleRentPaymentWallets(payment);
    } else if (
      payment.purpose === "service_due" &&
      !payment.landlordWalletTxId &&
      payment.payeeProfileId
    ) {
      await settleServiceDuePayment(payment);
    }
    return payment;
  }

  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  payment.status = "successful";
  payment.paidAt = new Date();

  if (!payment.receiptNumber && payment.purpose !== "wallet_deposit") {
    payment.receiptNumber = generateReceiptNumber();
  }

  if (payment.purpose === "rent" || payment.purpose === "agreement_fee" || payment.purpose === "service_due") {
    payment.receiptUrl = `${appUrl}/portal/payments?receipt=${payment._id}`;
    payment.receiptPdfUrl = `${appUrl}/api/portal/payments/${payment._id}/receipt/pdf`;
  }

  await payment.save();

  if (payment.purpose === "wallet_deposit") {
    await creditWalletDeposit(payment);
    return payment;
  }

  if (payment.purpose === "card_verification") {
    return payment;
  }

  if (payment.purpose === "agreement_fee") {
    await settleAgreementFeePayment(payment);
  } else if (payment.purpose === "service_due") {
    await settleServiceDuePayment(payment);
  } else {
    await settleRentPaymentWallets(payment);
  }

  const payee = payment.payeeProfileId
    ? await Profile.findById(payment.payeeProfileId).select("userId displayName").lean()
    : null;
  const payer = await User.findById(payment.payerUserId)
    .select("email name")
    .lean();
  const landlord = payee
    ? await User.findById(payee.userId).select("email").lean()
    : null;

  if (payer?.email) {
    try {
      await sendPaymentReceiptEmail(String(payment._id), String(payment.payerUserId));
    } catch (err) {
      console.warn("Receipt email failed:", err);
    }
  }

  if (payer) {
    const isAgreement = payment.purpose === "agreement_fee";
    await notifyUser({
      userId: String(payer._id),
      type: isAgreement ? "agreement.fee_paid" : "payment.successful",
      title: isAgreement ? "Agreement fee paid" : "Payment successful",
      body: isAgreement
        ? `Your agreement fee of ${payment.currency} ${payment.amount.toLocaleString()} was received. You can now sign the agreement.`
        : `Your payment of ${payment.currency} ${payment.amount.toLocaleString()} was successful.`,
      link: payment.receiptUrl || "/portal/payments",
      meta: {
        paymentId: String(payment._id),
        reference: payment.providerRef,
        receiptNumber: payment.receiptNumber,
      },
      email: undefined,
    });
  }

  if (
    landlord &&
    String(landlord._id) !== String(payment.payerUserId) &&
    (payment.purpose === "rent" || payment.purpose === "service_due")
  ) {
    const isService = payment.purpose === "service_due";
    await notifyUser({
      userId: String(landlord._id),
      type: "payment.received",
      title: isService ? "Service due received" : "Rent payment received",
      body: `${payment.currency} ${(payment.netPayeeAmount ?? payment.amount).toLocaleString()} was credited to your wallet.`,
      link: "/portal/payments",
      meta: {
        paymentId: String(payment._id),
        receiptNumber: payment.receiptNumber,
      },
      email: landlord.email
        ? {
            to: landlord.email,
            subject: isService ? "Service due received" : "Rent payment received",
          }
        : undefined,
    });
  }

  return payment;
}
