import { auth, db, storage, googleProvider } from './firebase-config.js';
import { 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, 
    getDoc,
    setDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 狀態變數 ---
export let currentUser = null;
export let currentUserRole = "guest";
export let currentPermissions = {};
export let globalPermissionsMap = {};
export let currentUserName = "";

// 角色階層與預設權限
const ROLE_HIERARCHY = ["guest", "member", "finance", "developer"];
const DEFAULT_PERMISSIONS = {
    "guest": { "can_view_schedule": true },
    "member": { "can_view_receipts": true, "can_upload_receipts": true, "can_view_tickets": true, "can_view_schedule": true, "can_view_attendance": true, "can_rsvp": true },
};

export function hasPermission(permissionName) {
    if (currentUserRole === "developer") return true;
    if (ROLE_HIERARCHY.includes(permissionName)) {
        return ROLE_HIERARCHY.indexOf(currentUserRole) >= ROLE_HIERARCHY.indexOf(permissionName);
    }
    return currentPermissions[permissionName] === true;
}

export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 路由邏輯
export function navigateTo(targetSection, pushState = true) {
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.page-section');

    navBtns.forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-section') === targetSection);
    });

    sections.forEach(sec => {
        sec.style.display = sec.id === `section-${targetSection}` ? 'block' : 'none';
    });

    if (pushState) {
        const url = new URL(window.location);
        url.searchParams.set('page', targetSection);
        window.history.pushState({}, '', url);
    }

    // 觸發各模組的載入 (這部分可以進一步優化)
    window.dispatchEvent(new CustomEvent('pageChange', { detail: { page: targetSection } }));
}

// 初始化 Auth
export function initAuth(onUserReady) {
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            // 獲取使用者權限與角色
            const userDoc = await getDoc(doc(db, 'users', user.email));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                currentUserRole = userData.role || "member";
                currentUserName = userData.name || user.displayName || user.email;
            } else {
                currentUserRole = "member";
                currentUserName = user.displayName || user.email;
                await setDoc(doc(db, 'users', user.email), {
                    email: user.email,
                    name: currentUserName,
                    role: "member",
                    createdAt: new Date()
                });
            }

            // 監聽全局權限表
            onSnapshot(doc(db, 'settings', 'permissions'), (snap) => {
                globalPermissionsMap = snap.exists() ? snap.data() : DEFAULT_PERMISSIONS;
                currentPermissions = globalPermissionsMap[currentUserRole] || {};
                if (onUserReady) onUserReady(user);
            });
        } else {
            currentUserRole = "guest";
            if (onUserReady) onUserReady(null);
        }
    });

    document.getElementById('login-btn')?.addEventListener('click', () => signInWithPopup(auth, googleProvider));
    document.getElementById('logout-btn')?.addEventListener('click', () => signOut(auth));
}
