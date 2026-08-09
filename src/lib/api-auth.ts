import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function getAuthUser() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;
  return session.user;
}

export async function assertAdmin() {
  await connectDB();
  const user = await getAuthUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!isAdminEmail(user.email)) {
    return {
      user: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { user, response: null };
}

export async function assertInvestor() {
  await connectDB();
  const user = await getAuthUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user, response: null };
}
