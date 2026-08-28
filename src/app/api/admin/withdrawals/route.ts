import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { serializeWithdrawalAdmin } from "@/lib/withdrawal-service";
import { Withdrawal } from "@/models/Withdrawal";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";

export async function GET(req: Request) {
  const { response } = await assertAdmin("users:read");
  if (response) return response;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "pending";

  await connectDB();
  const query =
    status === "all"
      ? {}
      : status === "disputes"
        ? { disputeStatus: "open" }
        : { status, payoutProvider: "manual" };

  const rows = await Withdrawal.find(query)
    .select("+accountNumber")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const profileIds = [...new Set(rows.map((r) => String(r.profileId)))];
  const userIds = [...new Set(rows.map((r) => String(r.userId)))];
  const [profiles, users] = await Promise.all([
    Profile.find({ _id: { $in: profileIds } }).select("displayName type").lean(),
    User.find({ _id: { $in: userIds } }).select("email name").lean(),
  ]);
  const profileMap = new Map(profiles.map((p) => [String(p._id), p]));
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return NextResponse.json({
    withdrawals: rows.map((w) => {
      const profile = profileMap.get(String(w.profileId));
      const user = userMap.get(String(w.userId));
      return {
        ...serializeWithdrawalAdmin(w as unknown as InstanceType<typeof Withdrawal>),
        profileName: profile?.displayName || "—",
        profileType: profile?.type || "—",
        userEmail: user?.email || "—",
        userName: user?.name || "—",
      };
    }),
  });
}
