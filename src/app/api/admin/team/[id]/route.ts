import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { Admin } from "@/models/Admin";
import {
  type AdminRole,
  type Permission,
  isEnvSuperAdmin,
  permissionsForRole,
  resolvePermissions,
} from "@/lib/rbac";
import {
  actorFromUser,
  diffObjects,
  leanDoc,
  sanitizeAuditValue,
  writeAudit,
} from "@/lib/audit";

const updateSchema = z.object({
  role: z.enum(["superadmin", "content_editor", "ops_kyc"]).optional(),
  permissions: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin("admins:manage");
  if (response || !user) return response!;

  const { id } = await context.params;
  if (id.startsWith("env:")) {
    return NextResponse.json(
      { error: "Environment bootstrap admins cannot be edited here." },
      { status: 400 }
    );
  }

  const admin = await Admin.findById(id);
  if (!admin) {
    return NextResponse.json({ error: "Admin not found." }, { status: 404 });
  }

  const before = leanDoc(admin.toObject() as Record<string, unknown>);

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  // Protect env-sourced records
  if (admin.source === "env" || isEnvSuperAdmin(admin.email)) {
    if (parsed.data.active === false) {
      return NextResponse.json(
        { error: "Cannot deactivate an environment bootstrap admin." },
        { status: 400 }
      );
    }
    if (parsed.data.role && parsed.data.role !== "superadmin") {
      return NextResponse.json(
        { error: "Cannot demote an environment bootstrap admin." },
        { status: 400 }
      );
    }
  }

  if (parsed.data.role === "superadmin" && !isEnvSuperAdmin(user.email)) {
    return NextResponse.json(
      { error: "Only environment bootstrap admins can grant superadmin." },
      { status: 403 }
    );
  }

  // Prevent removing your own manage access accidentally
  if (String(admin.userId) === user.id && parsed.data.active === false) {
    return NextResponse.json(
      { error: "You cannot deactivate your own admin access." },
      { status: 400 }
    );
  }

  if (parsed.data.role) admin.role = parsed.data.role as AdminRole;
  if (parsed.data.active != null) admin.active = parsed.data.active;

  if (admin.role === "superadmin") {
    admin.permissions = permissionsForRole("superadmin");
  } else if (parsed.data.permissions) {
    admin.permissions = parsed.data.permissions as Permission[];
  } else if (parsed.data.role) {
    admin.permissions = permissionsForRole(admin.role);
  }

  await admin.save();

  await writeAudit({
    action: "admin.update",
    summary: `Updated admin ${admin.email}`,
    actor: actorFromUser(user),
    entityType: "Admin",
    entityId: String(admin._id),
    investorVisible: false,
    changes: diffObjects(
      before,
      leanDoc(admin.toObject() as Record<string, unknown>),
      ["role", "permissions", "active", "name", "email"]
    ),
    request,
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

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin("admins:manage");
  if (response || !user) return response!;

  const { id } = await context.params;
  if (id.startsWith("env:")) {
    return NextResponse.json(
      { error: "Environment bootstrap admins cannot be removed." },
      { status: 400 }
    );
  }

  const admin = await Admin.findById(id);
  if (!admin) {
    return NextResponse.json({ error: "Admin not found." }, { status: 404 });
  }

  if (admin.source === "env" || isEnvSuperAdmin(admin.email)) {
    return NextResponse.json(
      { error: "Cannot remove an environment bootstrap admin." },
      { status: 400 }
    );
  }

  if (String(admin.userId) === user.id) {
    return NextResponse.json(
      { error: "You cannot remove your own admin access." },
      { status: 400 }
    );
  }

  await Admin.findByIdAndDelete(id);

  await writeAudit({
    action: "admin.remove",
    summary: `Removed admin ${admin.email}`,
    actor: actorFromUser(user),
    entityType: "Admin",
    entityId: String(admin._id),
    investorVisible: false,
    changes: [
      {
        field: "admin",
        oldValue: sanitizeAuditValue({
          email: admin.email,
          name: admin.name,
          role: admin.role,
          permissions: admin.permissions,
          active: admin.active,
        }),
        newValue: null,
      },
    ],
    request,
  });

  return NextResponse.json({ success: true });
}
