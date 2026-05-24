// ============================================================
// GT Studio Web — Core Type Definitions
// All domain models in one place. No Firestore raw access in UI.
// ============================================================

// ─── Roles ────────────────────────────────────────────────────
export type RoleId = 'guest' | 'member' | 'finance' | 'developer';

export type MemberStatus = 'active' | 'inactive';

export interface FirestoreDocMeta {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Receipts ─────────────────────────────────────────────────
export type ReceiptStatus = 'pending' | 'approved' | 'rejected';

export interface Receipt {
  id: string;
  title: string;
  amount: number;
  currency: string;
  note: string;
  fileUrl: string;
  fileType: 'image' | 'pdf';
  uploadedById: string;
  uploadedByName: string;
  status: ReceiptStatus;
  rejectionNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schedule / Events ────────────────────────────────────────
export interface ScheduleEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  timeStart: string;
  timeEnd: string;
  location: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AttendanceResponseValue = 'yes' | 'no';

export interface AttendanceResponse {
  id: string; // `${dateStr}_${userEmail}`
  date: string;
  userEmail: string;
  userName: string;
  response: AttendanceResponseValue;
  createdAt: Date;
  updatedAt: Date;
}

export type RsvpStatus = 'going' | 'maybe' | 'not_going';

export interface Rsvp {
  id: string; // `${eventId}_${userEmail}`
  eventId: string;
  userEmail: string;
  status: RsvpStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Members ──────────────────────────────────────────────────
export interface Member {
  id: string;
  email: string;
  name: string;
  roleId: RoleId;
  status: MemberStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Permissions ──────────────────────────────────────────────
export type PermissionKey =
  | 'can_view_receipts'
  | 'can_upload_receipts'
  | 'can_approve_receipts'
  | 'can_reject_receipts'
  | 'can_manage_members'
  | 'can_view_tickets'
  | 'can_view_schedule'
  | 'can_view_attendance'
  | 'can_report_tickets'
  | 'can_manage_tickets'
  | 'can_create_events'
  | 'can_manage_events'
  | 'can_rsvp';

export type PermissionMap = Record<PermissionKey, boolean>;
export type RolePermissions = Record<RoleId, PermissionMap>;

// ─── Tickets ──────────────────────────────────────────────────
export type TicketType = 'bug' | 'feature' | 'improvement';
export type TicketPriority = 'low' | 'medium' | 'high';
export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export interface Ticket {
  id: string;
  type: TicketType;
  title: string;
  description: string;
  priority: TicketPriority;
  photoUrl?: string;
  status: TicketStatus;
  submittedBy: string;
  createdBy: string; // email
  createdAt: Date;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  author: string;
  authorEmail: string;
  content: string;
  createdAt: Date;
}

// ─── Auth ─────────────────────────────────────────────────────
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// ─── Floorplan ────────────────────────────────────────────────
export interface Floorplan {
  imageUrl: string;
  label: string;
}