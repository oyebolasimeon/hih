import { connectDB } from "@/lib/db";
import { Admin } from "@/models/Admin";
import { User } from "@/models/User";
import {
  type AdminRole,
  type Permission,
  isEnvSuperAdmin,
  permissionsForRole,
  resolvePermissions,
  hasPermission,
} from "@/lib/rbac";

export type AdminAccess = {
  isAdmin: boolean;
  role: AdminRole | null;
  permissions: Permission[];
  adminId: string | null;
  source: "env" | "invite" | null;
};

export async function resolveAdminAccess(
  userId: string,
  email: string
): Promise<AdminAccess> {
  await connectDB();
  const normalized = email.trim().toLowerCase();

  // Bootstrap env superadmins into the admins collection
  if (isEnvSuperAdmin(normalized)) {
    const user = await User.findById(userId);
    let admin = await Admin.findOne({ email: normalized });
    if (!admin && user) {
      admin = await Admin.create({
        userId: user._id,
        email: normalized,
        name: user.name,
        role: "superadmin",
        permissions: permissionsForRole("superadmin"),
        source: "env",
        active: true,
      });
    } else if (admin) {
      // Keep env admins as active superadmins
      admin.role = "superadmin";
      admin.permissions = permissionsForRole("superadmin");
      admin.source = "env";
      admin.active = true;
      admin.userId = user?._id || admin.userId;
      if (user?.name) admin.name = user.name;
      await admin.save();
    }

    return {
      isAdmin: true,
      role: "superadmin",
      permissions: permissionsForRole("superadmin"),
      adminId: admin ? String(admin._id) : null,
      source: "env",
    };
  }

  const admin = await Admin.findOne({
    $or: [{ userId }, { email: normalized }],
    active: true,
  });

  if (!admin) {
    return {
      isAdmin: false,
      role: null,
      permissions: [],
      adminId: null,
      source: null,
    };
  }

  const permissions = resolvePermissions(
    admin.role,
    admin.permissions as Permission[]
  );

  return {
    isAdmin: true,
    role: admin.role,
    permissions,
    adminId: String(admin._id),
    source: admin.source,
  };
}

export { hasPermission };
