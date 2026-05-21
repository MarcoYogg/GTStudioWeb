import { signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const ROLE_HIERARCHY = ['guest', 'member', 'finance', 'developer'];
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
    can_rsvp: true
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
    can_rsvp: true
  }
};

function ensurePermissionDefaults(appState) {
  appState.currentPermissions = appState.currentPermissions || { ...DEFAULT_PERMISSIONS.guest };
  appState.globalPermissionsMap = appState.globalPermissionsMap || { ...DEFAULT_PERMISSIONS };
}

export function initAuthModule({ auth, db, googleProvider, appState, onAuthReady }) {
  ensurePermissionDefaults(appState);

  onAuthStateChanged(auth, async (user) => {
    appState.currentUser = user || null;

    try {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.email));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          appState.currentUserRole = userData.role || 'member';
          appState.currentUserName = userData.name || user.displayName || user.email;
        } else {
          appState.currentUserRole = 'member';
          appState.currentUserName = user.displayName || user.email;
          await setDoc(doc(db, 'users', user.email), {
            email: user.email,
            name: appState.currentUserName,
            role: 'member',
            createdAt: new Date()
          });
        }

        onSnapshot(doc(db, 'settings', 'permissions'), (snap) => {
          appState.globalPermissionsMap = snap.exists() ? snap.data() : { ...DEFAULT_PERMISSIONS };
          appState.currentPermissions = appState.globalPermissionsMap[appState.currentUserRole] || appState.globalPermissionsMap.guest || { ...DEFAULT_PERMISSIONS.guest };
          onAuthReady?.(user);
        }, () => {
          appState.currentPermissions = { ...DEFAULT_PERMISSIONS.guest };
          onAuthReady?.(user);
        });
      } else {
        appState.currentUserRole = 'guest';
        appState.currentUserName = '';
        appState.currentPermissions = appState.globalPermissionsMap.guest || { ...DEFAULT_PERMISSIONS.guest };
        onAuthReady?.(null);
      }
    } catch (error) {
      appState.currentUserRole = 'guest';
      appState.currentUserName = '';
      appState.currentPermissions = { ...DEFAULT_PERMISSIONS.guest };
      onAuthReady?.(null);
    }
  });

  document.getElementById('login-btn')?.addEventListener('click', () => signInWithPopup(auth, googleProvider));
  document.getElementById('logout-btn')?.addEventListener('click', () => signOut(auth));

  return { ready: true, name: 'auth' };
}
