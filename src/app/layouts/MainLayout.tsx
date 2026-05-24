import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/auth.store';
import { logout } from '../../features/auth/auth.service';
import { ROUTES } from '../../constants/routes';
import ToastContainer from '../../components/common/Toast';
import { useCurrentUser } from '../../hooks/useCurrentUser';

const NAV_ITEMS = [
  { to: ROUTES.HOME, label: '首頁' },
  { to: ROUTES.RECEIPTS, label: '收據' },
  { to: ROUTES.SCHEDULE, label: '行事曆' },
  { to: ROUTES.MEMBERS, label: '成員管理' },
  { to: ROUTES.TICKETS, label: 'Tickets' },
  { to: ROUTES.FLOORPLAN, label: '平面圖' },
];

export default function MainLayout() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { roleId } = useCurrentUser();

  if (isLoading) {
    return <div className="loading-screen">載入中…</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return (
    <div className="main-layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>GT Studio</h2>
        </div>
        <SidebarNav />
        <div className="sidebar-footer">
          <span className="sidebar-user">{user.displayName ?? user.email}{roleId ? ` (${roleId})` : ''}</span>
          <button className="btn-logout" onClick={logout}>登出</button>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
}

function SidebarNav() {
  const location = useLocation();

  return (
    <ul className="sidebar-nav">
      {NAV_ITEMS.map((item) => (
        <li key={item.to}>
          <Link
            to={item.to}
            className={location.pathname === item.to ? 'nav-active' : ''}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}