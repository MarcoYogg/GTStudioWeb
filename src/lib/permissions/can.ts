import type { AuthUser, RoleId, PermissionKey } from '../../types';
import { DEFAULT_ROLE_PERMISSIONS } from './roles';
import { PERMISSION_KEYS } from '../../constants/permissions';

// In-memory override cache: loaded from Firestore config/permissions
let _permissionOverrides: Record<string, Partial<Record<PermissionKey, boolean>>> | null = null;

export function setPermissionOverrides(
  overrides: Record<string, Partial<Record<PermissionKey, boolean>>>
) {
  _permissionOverrides = overrides;
}

export function clearPermissionOverrides() {
  _permissionOverrides = null;
}

/**
 * Resolve a role's effective permissions — default matrix + overrides.
 */
export function getPermissionsForRole(roleId: RoleId): Record<PermissionKey, boolean> {
  const defaults = DEFAULT_ROLE_PERMISSIONS[roleId];
  if (!defaults) return DEFAULT_ROLE_PERMISSIONS.guest;

  const overrides = _permissionOverrides?.[roleId];
  if (!overrides) return { ...defaults };

  const merged = { ...defaults, ...overrides };
  const normalized: Record<PermissionKey, boolean> = {} as Record<PermissionKey, boolean>;

  for (const key of PERMISSION_KEYS) {
    normalized[key] = merged[key] ?? false;
  }

  return normalized;
}

/**
 * Central permission check.
 * Usage: `can(authUser, 'can_upload_receipts')`
 * If authUser or role is unavailable, defaults to false.
 */
export function can(
  user: AuthUser | null,
  roleId: RoleId | null,
  permission: PermissionKey
): boolean {
  if (!user || !roleId) return false;
  const permissions = getPermissionsForRole(roleId);
  return permissions[permission] ?? false;
}