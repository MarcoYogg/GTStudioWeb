import type { RoleId, RolePermissions } from '../../types';

/**
 * Default permission matrix for each role.
 * Developer has all permissions; others are restricted.
 *
 * Keep every role map exhaustive and aligned with PERMISSION_KEYS.
 */
export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  guest: {
    can_view_receipts: false,
    can_upload_receipts: false,
    can_approve_receipts: false,
    can_reject_receipts: false,
    can_manage_members: false,
    can_view_tickets: false,
    can_view_schedule: true,
    can_view_attendance: false,
    can_report_tickets: false,
    can_manage_tickets: false,
    can_create_events: false,
    can_manage_events: false,
    can_rsvp: false,
  },
  member: {
    can_view_receipts: true,
    can_upload_receipts: true,
    can_approve_receipts: false,
    can_reject_receipts: false,
    can_manage_members: false,
    can_view_tickets: true,
    can_view_schedule: true,
    can_view_attendance: true,
    can_report_tickets: true,
    can_manage_tickets: false,
    can_create_events: false,
    can_manage_events: false,
    can_rsvp: true,
  },
  finance: {
    can_view_receipts: true,
    can_upload_receipts: true,
    can_approve_receipts: true,
    can_reject_receipts: true,
    can_manage_members: false,
    can_view_tickets: true,
    can_view_schedule: true,
    can_view_attendance: true,
    can_report_tickets: true,
    can_manage_tickets: false,
    can_create_events: false,
    can_manage_events: false,
    can_rsvp: true,
  },
  developer: {
    can_view_receipts: true,
    can_upload_receipts: true,
    can_approve_receipts: true,
    can_reject_receipts: true,
    can_manage_members: true,
    can_view_tickets: true,
    can_view_schedule: true,
    can_view_attendance: true,
    can_report_tickets: true,
    can_manage_tickets: true,
    can_create_events: true,
    can_manage_events: true,
    can_rsvp: true,
  },
};

/**
 * Role hierarchy for fallback checks.
 * Higher index = more privileged.
 */
export const ROLE_HIERARCHY: RoleId[] = ['guest', 'member', 'finance', 'developer'];

/** Check if roleA >= roleB in hierarchy */
export function isRoleAtLeast(roleA: RoleId, roleB: RoleId): boolean {
  return ROLE_HIERARCHY.indexOf(roleA) >= ROLE_HIERARCHY.indexOf(roleB);
}