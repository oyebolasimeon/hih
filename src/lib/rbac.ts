export const PERMISSIONS = [
  "investors:read",
  "investors:write",
  "properties:read",
  "properties:write",
  "bookings:read",
  "bookings:write",
  "analytics:read",
  "analytics:write",
  "content:read",
  "content:write",
  "admins:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type AdminRole = "superadmin" | "admin" | "viewer";

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  superadmin: [...PERMISSIONS],
  admin: [
    "investors:read",
    "investors:write",
    "properties:read",
    "properties:write",
    "bookings:read",
    "bookings:write",
    "analytics:read",
    "analytics:write",
    "content:read",
    "content:write",
  ],
  viewer: [
    "investors:read",
    "properties:read",
    "bookings:read",
    "analytics:read",
    "content:read",
  ],
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  "investors:read": "View investors",
  "investors:write": "Edit investors",
  "properties:read": "View properties",
  "properties:write": "Edit properties",
  "bookings:read": "View bookings",
  "bookings:write": "Edit bookings",
  "analytics:read": "View analytics",
  "analytics:write": "Edit analytics",
  "content:read": "View site content",
  "content:write": "Edit site content",
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
