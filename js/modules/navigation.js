function renderPage(targetSection) {
  const appContent = document.getElementById('app-content');
  if (!appContent) return;
  appContent.innerHTML = `<section id="section-${targetSection}" class="page-section">${targetSection}</section>`;
}

function bindNavButtons() {
  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const targetSection = button.getAttribute('data-section');
      window.dispatchEvent(new CustomEvent('pageChange', { detail: { page: targetSection } }));
    });
  });
}

function updateNavigationUI(appState) {
  document.querySelectorAll('.nav-btn').forEach((button) => {
    const targetSection = button.getAttribute('data-section');
    if (targetSection === 'admin') {
      button.style.display = appState.currentUserRole === 'developer' ? '' : 'none';
    }
    button.classList.toggle('active', targetSection === (window.__GT?.currentPage || 'home'));
  });

  const userEmailSpan = document.getElementById('user-email');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  if (userEmailSpan) userEmailSpan.textContent = appState.currentUser ? `${appState.currentUserName} (${appState.currentUserRole})` : '';
  if (loginBtn) loginBtn.style.display = appState.currentUser ? 'none' : 'inline-block';
  if (logoutBtn) logoutBtn.style.display = appState.currentUser ? 'inline-block' : 'none';
}

export function initNavigationModule({ appState, hasPermission, showToast }) {
  void hasPermission;
  void showToast;
  bindNavButtons();
  window.addEventListener('pageChange', (event) => {
    window.__GT = window.__GT || {};
    window.__GT.currentPage = event.detail.page;
    renderPage(event.detail.page);
    updateNavigationUI(appState);
  });
  updateNavigationUI(appState);
  return { ready: true, name: 'navigation' };
}
