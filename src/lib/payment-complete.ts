import { notifyUser } from "@/lib/profile-context";
import { creditWalletDeposit, settleRentPaymentWallets } from "@/lib/wallet";
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
    } else if (
      payment.purpose === "rent" &&
      !payment.landlordWalletTxId &&
      payment.payeeProfileId
    ) {
      await settleRentPaymentWallets(payment);
    }
    return payment;
  }

  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  payment.status = "successful";
  payment.paidAt = new Date();
  if (!payment.receiptNumber && payment.purpose === "rent") {
    payment.receiptNumber = generateReceiptNumber();
  }
  if (payment.purpose === "rent") {
    payment.receiptUrl = `${appUrl}/portal/payments?receipt=${payment._id}`;
  }
  await payment.save();

  if (payment.purpose === "wallet_deposit") {
    await creditWalletDeposit(payment);
    return payment;
  }

  await settleRentPaymentWallets(payment);

  const payee = payment.payeeProfileId
    ? await Profile.findById(payment.payeeProfileId).select("userId displayName").lean()
    : null;
  const payer = await User.findById(payment.payerUserId)
    .select("email name")
    .lean();
  const landlord = payee
    ? await User.findById(payee.userId).select("email").lean()
    : null;

  if (payer) {
    const isDeposit = payment.purpose === "wallet_deposit";
    await notifyUser({
      userId: String(payer._id),
      type: isDeposit ? "wallet.deposit" : "payment.successful",
      title: isDeposit ? "Wallet deposit successful" : "Rent payment successful",
      body: isDeposit
        ? `${payment.currency} ${payment.amount.toLocaleString()} was added to your wallet.`
        : `Your payment of ${payment.currency} ${payment.amount.toLocaleString()} was successful.`,
      link: payment.receiptUrl || "/portal/payments",
      meta: {
        paymentId: String(payment._id),
        reference: payment.providerRef,
        receiptNumber: payment.receiptNumber,
      },
      email: payer.email
        ? {
            to: payer.email,
            subject: isDeposit ? "Wallet deposit confirmed" : "Rent payment receipt",
          }
        : undefined,
    });
  }
  if (
    landlord &&
    String(landlord._id) !== String(payment.payerUserId) &&
    payment.purpose === "rent"
  ) {
    await notifyUser({
      userId: String(landlord._id),
      type: "payment.received",
      title: "Rent payment received",
      body: `${payment.currency} ${payment.amount.toLocaleString()} was credited to your wallet.`,
      link: "/portal/payments",
      meta: {
        paymentId: String(payment._id),
        receiptNumber: payment.receiptNumber,
      },
      email: landlord.email
        ? { to: landlord.email, subject: "Rent payment received" }
        : undefined,
    });
  }

  return payment;
}
