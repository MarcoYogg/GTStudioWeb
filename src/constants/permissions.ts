import type { PermissionKey } from '../types';

/**
 * All permission keys used across the system.
 * Single source of truth — import from here, not magic strings.
 */
export const PERMISSION_KEYS: PermissionKey[] = [
  'can_view_receipts',
  'can_upload_receipts',
  'can_approve_receipts',
  'can_reject_receipts',
  'can_manage_members',
  'can_view_tickets',
  'can_view_schedule',
  'can_view_attendance',
  'can_report_tickets',
  'can_manage_tickets',
  'can_create_events',
  'can_manage_events',
  'can_rsvp',
] as const;

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  can_view_receipts: '檢視收據',
  can_upload_receipts: '上傳收據',
  can_approve_receipts: '核准收據',
  can_reject_receipts: '拒絕收據',
  can_manage_members: '管理成員',
  can_view_tickets: '檢視 Ticket',
  can_view_schedule: '檢視行事曆',
  can_view_attendance: '檢視出席',
  can_report_tickets: '回報 Ticket',
  can_manage_tickets: '管理 Ticket',
  can_create_events: '建立活動',
  can_manage_events: '管理活動',
  can_rsvp: '參加活動',
};

/**
 * Firestore permission document mapping note:
 * - config/permissions stores per-role overrides keyed by RoleId.
 * - Keep this aligned with Firebase Rules prep and DEFAULT_ROLE_PERMISSIONS.
 */
export const PERMISSION_RULES_DOC = 'config/permissions';