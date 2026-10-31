import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

/** Lightweight user lookup for outreach recipients (content admins). */
export async function GET(req: Request) {
  const { response } = await assertAdmin("content:read");
  if (response) return response;

  await connectDB();
  const url = new URL(req.url);
  const search = (url.searchParams.get("search") || "").trim();
  if (search.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const users = await User.find({
    $or: [
      { email: { $regex: escaped, $options: "i" } },
      { name: { $regex: escaped, $options: "i" } },
    ],
    email: { $exists: true, $ne: "" },
  })
    .select("name email")
    .sort({ name: 1 })
    .limit(20)
    .lean();

  return NextResponse.json({
    users: users.map((u) => ({
      id: String(u._id),
      name: u.name || "",
      email: u.email,
    })),
  });
}
