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
    can_rsvp: true
  }
};

function ensurePermissionDefaults(appState) {
  appState.currentPermissions = appState.currentPermissions || { ...DEFAULT_PERMISSIONS.guest };
  appState.globalPermissionsMap = appState.globalPermissionsMap || { ...DEFAULT_PERMISSIONS };
}

function normalizeRole(roleValue) {
  const normalizedRole = String(roleValue || '').trim().toLowerCase();
  return ROLE_HIERARCHY.includes(normalizedRole) ? normalizedRole : 'member';
}

function buildPermissionDeniedMessage(error) {
  if (error?.code === 'permission-denied') return '資料存取權限不足，已套用預設權限';
  return '權限設定載入失敗，已套用預設權限';
}

function applyRolePermissions(appState) {
  appState.currentPermissions =
    appState.globalPermissionsMap[appState.currentUserRole] ||
    appState.globalPermissionsMap.guest ||
    { ...DEFAULT_PERMISSIONS.guest };
}

export function initAuthModule({ auth, db, googleProvider, appState, onAuthReady }) {
  ensurePermissionDefaults(appState);
  let unsubscribePermissions = null;

  onAuthStateChanged(auth, async (user) => {
    appState.currentUser = user || null;

    try {
      if (user) {
        if (typeof unsubscribePermissions === 'function') {
          unsubscribePermissions();
          unsubscribePermissions = null;
        }

        // 使用 member collection 當角色權威來源，避免 users/member 角色漂移
        const memberDocRef = doc(db, 'member', user.email);
        const memberDoc = await getDoc(memberDocRef);

        if (memberDoc.exists()) {
          const memberData = memberDoc.data();
          appState.currentUserRole = normalizeRole(memberData.Role);
          appState.currentUserName = memberData.Name || user.displayName || user.email;
        } else {
          appState.currentUserRole = 'member';
          appState.currentUserName = user.displayName || user.email;

          // 若首次登入尚未有 member 紀錄，建立最小預設資料
          await setDoc(memberDocRef, {
            Email: user.email,
            Name: appState.currentUserName,
            Role: 'member',
            Status: 'active',
            createdAt: new Date()
          });
        }

        unsubscribePermissions = onSnapshot(
          doc(db, 'settings', 'permissions'),
          (snap) => {
            appState.globalPermissionsMap = snap.exists() ? snap.data() : { ...DEFAULT_PERMISSIONS };
            applyRolePermissions(appState);
            onAuthReady?.(user);
          },
          (error) => {
            console.error('[auth] permission snapshot failed:', error?.code || error);
            alert(buildPermissionDeniedMessage(error));
            appState.globalPermissionsMap = { ...DEFAULT_PERMISSIONS };
            applyRolePermissions(appState);
            onAuthReady?.(user);
          }
        );
      } else {
        if (typeof unsubscribePermissions === 'function') {
          unsubscribePermissions();
          unsubscribePermissions = null;
        }

        appState.currentUserRole = 'guest';
        appState.currentUserName = '';
        appState.currentPermissions = appState.globalPermissionsMap.guest || { ...DEFAULT_PERMISSIONS.guest };
        onAuthReady?.(null);
      }
    } catch (error) {
      console.error('[auth] init failed:', error?.code || error);
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