export const PERMISSIONS = [
  "users:read",
  "users:write",
  "kyc:read",
  "kyc:write",
  "listings:read",
  "listings:verify",
  "content:read",
  "content:write",
  "fraud:read",
  "fraud:write",
  "audit:read",
  "admins:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Internal staff roles (Admin Console) — not KYC profiles */
export type AdminRole = "superadmin" | "content_editor" | "ops_kyc";

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  superadmin: [...PERMISSIONS],
  content_editor: ["content:read", "content:write", "audit:read"],
  ops_kyc: [
    "users:read",
    "users:write",
    "kyc:read",
    "kyc:write",
    "listings:read",
    "listings:verify",
    "fraud:read",
    "fraud:write",
    "audit:read",
  ],
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  superadmin: "Super Admin",
  content_editor: "Content Editor",
  ops_kyc: "Ops / KYC Reviewer",
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  "users:read": "View users",
  "users:write": "Edit users",
  "kyc:read": "View KYC submissions",
  "kyc:write": "Approve / reject KYC",
  "listings:read": "View listings",
  "listings:verify": "Verify listings",
  "content:read": "View website content",
  "content:write": "Edit & publish website content",
  "fraud:read": "View fraud reports",
  "fraud:write": "Manage fraud reports",
  "audit:read": "View audit logs",
  "admins:manage": "Manage admins & RBAC",
};

export function getEnvAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEnvSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  return getEnvAdminEmails().includes(email.trim().toLowerCase());
}

export function permissionsForRole(role: AdminRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function resolvePermissions(
  role: AdminRole,
  overrides?: Permission[] | null
): Permission[] {
  if (role === "superadmin") return [...PERMISSIONS];
  if (overrides && overrides.length > 0) {
    return [...new Set(overrides)];
  }
  return permissionsForRole(role);
}

export function hasPermission(
  granted: string[] | undefined | null,
  required: Permission | Permission[]
): boolean {
  if (!granted?.length) return false;
  if (granted.includes("*")) return true;
  const needed = Array.isArray(required) ? required : [required];
  return needed.every((p) => granted.includes(p));
}

/** @deprecated use resolveAdminAccess */
export function getAdminEmails() {
  return getEnvAdminEmails();
}

/** @deprecated use resolveAdminAccess */
export function isAdminEmail(email?: string | null) {
  return isEnvSuperAdmin(email);
}
