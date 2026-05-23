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

const PAGE_SECTIONS = new Set(['home', 'upload', 'list', 'floorplan', 'schedule', 'admin', 'tickets']);
const pageRegistry = new Map();

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
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay?.style) {
    loadingOverlay.style.display = 'none';
  }
}

function renderHomePage() {
  const appContent = document.getElementById('app-content');
  if (!appContent) return;

  appContent.innerHTML = `
    <section id="section-home" class="page-section">
      <h2>Home</h2>
      <p>Welcome to GT Studio internal app.</p>
    </section>
  `;
}

function renderUnknownPage(pageName) {
  const appContent = document.getElementById('app-content');
  if (!appContent) return;

  appContent.innerHTML = `
    <section class="page-section">
      <h2>Page Not Found</h2>
      <p>Unknown page: ${pageName}</p>
    </section>
  `;
}

function renderForbiddenPage(pageName) {
  const appContent = document.getElementById('app-content');
  if (!appContent) return;

  appContent.innerHTML = `
    <section class="page-section">
      <h2>Access Denied</h2>
      <p>You do not have access to this page: ${pageName}</p>
    </section>
  `;
}

function renderFloorplanPage() {
  const appContent = document.getElementById('app-content');
  if (!appContent) return;

  appContent.innerHTML = `
    <section id="section-floorplan" class="page-section">
      <h2>Floor Plan</h2>
      <img src="floorplan-placeholder.jpeg" alt="Floor Plan" style="max-width:100%;height:auto;border-radius:8px;">
    </section>
  `;
}

function registerPages(moduleResult) {
  const pages = moduleResult?.pages;
  if (!pages || typeof pages !== 'object') return;

  Object.entries(pages).forEach(([pageName, pageHandler]) => {
    if (!PAGE_SECTIONS.has(pageName)) return;
    if (!pageHandler || typeof pageHandler.render !== 'function') return;
    pageRegistry.set(pageName, pageHandler);
  });
}

function renderPageShell(pageName) {
  if (pageName === 'home') {
    renderHomePage();
    return;
  }

  if (!PAGE_SECTIONS.has(pageName)) {
    renderUnknownPage(pageName);
    return;
  }

  const pageHandler = pageRegistry.get(pageName);
  if (!pageHandler) {
    renderUnknownPage(pageName);
    return;
  }

  if (pageHandler.canAccess && !pageHandler.canAccess()) {
    showToast('You do not have access to this page.', 'error');
    renderForbiddenPage(pageName);
    return;
  }

  pageHandler.render();
  if (typeof pageHandler.afterRender === 'function') {
    pageHandler.afterRender();
  }
}

function bindPageRenderer() {
  window.addEventListener('pageChange', (event) => {
    const pageName = event?.detail?.page;
    if (!pageName) return;
    window.__GT = window.__GT || {};
    window.__GT.currentPage = pageName;
    renderPageShell(pageName);
  });
}

function refreshCurrentPageAfterAuth() {
  const currentPage = window.__GT?.currentPage || 'home';
  window.dispatchEvent(new CustomEvent('pageChange', { detail: { page: currentPage } }));
}

function initApp() {
  window.__GT = { auth, db, storage, googleProvider, appState, hasPermission, showToast, currentPage: 'home' };

  bindPageRenderer();
  initAuthModule({
    auth,
    db,
    googleProvider,
    appState,
    onAuthReady: () => {
      setAppVisible();
      window.dispatchEvent(new CustomEvent('authStateReady'));
      refreshCurrentPageAfterAuth();
    }
  });
  initNavigationModule({ appState, hasPermission, showToast });

  registerPages(initReceiptsModule({ db, storage, appState, hasPermission, showToast }));
  registerPages(initScheduleModule({ db, appState, hasPermission, showToast }));
  registerPages(initAdminModule({ db, appState, hasPermission, showToast }));
  registerPages(initTicketsModule({ db, storage, appState, hasPermission, showToast }));
  registerPages({
    pages: {
      floorplan: {
        canAccess: () => true,
        render: renderFloorplanPage
      }
    }
  });

  renderPageShell('home');
}

export { initApp };
