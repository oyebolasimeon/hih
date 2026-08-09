import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import { resolveAdminAccess, hasPermission } from "@/lib/admin";
import type { Permission } from "@/lib/rbac";
import { NextResponse } from "next/server";

export async function getAuthUser() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;
  return session.user;
}

export async function assertAdmin(required?: Permission | Permission[]) {
  await connectDB();
  const user = await getAuthUser();
  if (!user) {
    return {
      user: null as null,
      access: null as null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const access = await resolveAdminAccess(user.id, user.email);
  if (!access.isAdmin) {
    return {
      user: null,
      access: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  if (required && !hasPermission(access.permissions, required)) {
    return {
      user: null,
      access: null,
      response: NextResponse.json(
        { error: "You do not have permission for this action." },
        { status: 403 }
      ),
    };
  }

  return {
    user: {
      ...user,
      isAdmin: true,
      role: access.role,
      permissions: access.permissions,
    },
    access,
    response: null,
  };
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
