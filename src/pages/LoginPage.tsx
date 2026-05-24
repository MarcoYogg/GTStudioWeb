import { useAuthStore } from '../features/auth/auth.store';
import { loginWithGoogle } from '../features/auth/auth.service';

export default function LoginPage() {
  const isLoading = useAuthStore((s) => s.isLoading);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  if (isLoading) {
    return <div className="loading-screen">載入中…</div>;
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>GT Studio 管理系統</h1>
        <p>請使用 Google 帳號登入</p>
        <button className="btn btn-primary" onClick={handleLogin}>
          使用 Google 登入
        </button>
      </div>
    </div>
  );
}
