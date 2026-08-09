import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { Admin } from "@/models/Admin";
import { User } from "@/models/User";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  type AdminRole,
  type Permission,
  isEnvSuperAdmin,
  permissionsForRole,
  resolvePermissions,
} from "@/lib/rbac";

export async function GET() {
  const { user, response } = await assertAdmin("admins:manage");
  if (response || !user) return response!;

  const admins = await Admin.find().sort({ createdAt: -1 }).lean();

  // Ensure env emails appear even before first login
  const envEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const existing = new Set(admins.map((a) => a.email));
  const synthetic = [];
  for (const email of envEmails) {
    if (!existing.has(email)) {
      synthetic.push({
        id: `env:${email}`,
        userId: null,
        email,
        name: email,
        role: "superadmin" as AdminRole,
        permissions: permissionsForRole("superadmin"),
        source: "env" as const,
        active: true,
        pending: true,
      });
    }
  }

  return NextResponse.json({
    admins: [
      ...synthetic,
      ...admins.map((a) => ({
        id: String(a._id),
        userId: String(a.userId),
        email: a.email,
        name: a.name,
        role: a.role,
        permissions: resolvePermissions(a.role, a.permissions as Permission[]),
        source: a.source,
        active: a.active,
        pending: false,
        createdAt: a.createdAt,
      })),
    ],
    roles: ROLE_PERMISSIONS,
    allPermissions: PERMISSIONS,
  });
}

const createSchema = z.object({
  email: z.string().email(),
  role: z.enum(["superadmin", "admin", "viewer"]),
  permissions: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const { user, response } = await assertAdmin("admins:manage");
  if (response || !user) return response!;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid admin payload." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const targetUser = await User.findOne({ email });
  if (!targetUser) {
    return NextResponse.json(
      {
        error:
          "No registered user with that email. Ask them to sign up first, then add them as admin.",
      },
      { status: 404 }
    );
  }

  const existing = await Admin.findOne({ email });
  if (existing) {
    return NextResponse.json(
      { error: "This user is already an admin." },
      { status: 409 }
    );
  }

  // Only env superadmins can create other superadmins
  if (parsed.data.role === "superadmin" && !isEnvSuperAdmin(user.email)) {
    return NextResponse.json(
      { error: "Only environment bootstrap admins can grant superadmin." },
      { status: 403 }
    );
  }

  const role = parsed.data.role as AdminRole;
  const permissions =
    role === "superadmin"
      ? permissionsForRole("superadmin")
      : ((parsed.data.permissions as Permission[])?.length
          ? (parsed.data.permissions as Permission[])
          : permissionsForRole(role));

  const admin = await Admin.create({
    userId: targetUser._id,
    email,
    name: targetUser.name,
    role,
    permissions,
    source: "invite",
    active: true,
    createdBy: user.id,
  });

  return NextResponse.json({
    admin: {
      id: String(admin._id),
      userId: String(admin.userId),
      email: admin.email,
      name: admin.name,
      role: admin.role,
      permissions: resolvePermissions(admin.role, admin.permissions as Permission[]),
      source: admin.source,
      active: admin.active,
    },
  });
}
