import { useState, useEffect, useCallback } from 'react';
import { fetchReceipts } from '../receipts.service';
import type { Receipt } from '../../../types';
import ReceiptDetailModal from './ReceiptDetailModal';
import Badge from '../../../components/common/Badge';
import EmptyState from '../../../components/common/EmptyState';
import ErrorState from '../../../components/common/ErrorState';
import { useUiStore } from '../../../store/ui.store';

const STATUS_VARIANT: Record<string, 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

const STATUS_LABEL: Record<string, string> = {
  pending: '待審核',
  approved: '已核准',
  rejected: '已拒絕',
};

interface Props {
  refreshKey: number;
}

export default function ReceiptList({ refreshKey }: Props) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const addToast = useUiStore((s) => s.addToast);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReceipts();
      setReceipts(data);
    } catch (err) {
      console.error(err);
      setError('讀取收據失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleDeleted = () => {
    setSelectedReceipt(null);
    load();
    addToast('已刪除收據', 'success');
  };

  const filtered = statusFilter === 'all'
    ? receipts
    : receipts.filter((r) => r.status === statusFilter);

  if (loading) return <div className="loading-indicator">載入中…</div>;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (receipts.length === 0) return <EmptyState message="尚無收據資料" />;

  return (
    <div className="receipt-list-section">
      {/* Status filter tabs */}
      <div className="filter-tabs">
        {['all', 'pending', 'approved', 'rejected'].map((s) => (
          <button
            key={s}
            className={`filter-tab ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? '全部' : STATUS_LABEL[s] ?? s}
            {s !== 'all' && (
              <span className="filter-count">
                ({receipts.filter((r) => r.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Receipt table */}
      <table className="receipt-table">
        <thead>
          <tr>
            <th>標題</th>
            <th>金額</th>
            <th>上傳者</th>
            <th>狀態</th>
            <th>日期</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id} className="receipt-row" onClick={() => setSelectedReceipt(r)}>
              <td className="receipt-title">{r.title}</td>
              <td>HK${r.amount.toLocaleString()}</td>
              <td>{r.uploadedByName}</td>
              <td>
                <Badge
                  text={STATUS_LABEL[r.status] ?? r.status}
                  variant={STATUS_VARIANT[r.status] ?? 'default'}
                />
              </td>
              <td>{new Date(r.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Detail modal */}
      {selectedReceipt && (
        <ReceiptDetailModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          onUpdated={load}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}