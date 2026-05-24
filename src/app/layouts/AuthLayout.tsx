import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/auth.store';
import { ROUTES } from '../../constants/routes';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="loading-screen">載入中…</div>;
  }

  // Already logged in — redirect to home
  if (isAuthenticated) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return (
    <div className="auth-layout">
      <Outlet />
    </div>
  );
}