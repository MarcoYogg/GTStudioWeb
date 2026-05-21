import { auth, db, storage, googleProvider } from '../firebase-config.js';
import { initAuthModule } from './auth.js';
import { initNavigationModule } from './navigation.js';
import { initReceiptsModule } from './receipts.js';
import { initScheduleModule } from './schedule.js';
import { initAdminModule } from './admin.js';
import { initTicketsModule } from './tickets.js';

const DEFAULT_PERMISSIONS = {
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
    can_rsvp: false
  }
};

const appState = {
  currentUser: null,
  currentUserRole: 'guest',
  currentPermissions: { ...DEFAULT_PERMISSIONS.guest },
  globalPermissionsMap: { ...DEFAULT_PERMISSIONS },
  currentUserName: '',
  allMembers: []
};

function hasPermission(permissionName) {
  if (appState.currentUserRole === 'developer') return true;
  return appState.currentPermissions[permissionName] === true;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function setAppVisible() {
  document.body.classList.remove('app-hidden');
  document.getElementById('loading-overlay')?.style && (document.getElementById('loading-overlay').style.display = 'none');
}

function initApp() {
  window.__GT = { auth, db, storage, googleProvider, appState, hasPermission, showToast };
  initAuthModule({ auth, db, googleProvider, appState, onAuthReady: setAppVisible });
  initNavigationModule({ appState, hasPermission, showToast });
  initReceiptsModule({ db, storage, appState, hasPermission, showToast });
  initScheduleModule({ db, appState, hasPermission, showToast });
  initAdminModule({ db, appState, hasPermission, showToast });
  initTicketsModule({ db, storage, appState, hasPermission, showToast });
}

export { initApp };
