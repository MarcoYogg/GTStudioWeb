import { useAuthStore } from '../features/auth/auth.store';

export default function HomePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="page home-page">
      <h1>歡迎回來，{user?.displayName ?? '使用者'}</h1>
      <div className="dashboard-cards">
        <div className="card">
          <h3>收據</h3>
          <p>上傳與管理收據</p>
        </div>
        <div className="card">
          <h3>行事曆</h3>
          <p>查看出席與活動</p>
        </div>
        <div className="card">
          <h3>Tickets</h3>
          <p>回報與追蹤問題</p>
        </div>
      </div>
    </div>
  );
}