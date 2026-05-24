import { useState } from 'react';
import {
  approveReceipt as approveService,
  rejectReceipt as rejectService,
  deleteReceipt as deleteService,
} from '../receipts.service';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useUiStore } from '../../../store/ui.store';
import type { Receipt } from '../../../types';
import Badge from '../../../components/common/Badge';

interface Props {
  receipt: Receipt;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export default function ReceiptDetailModal({ receipt, onClose, onUpdated, onDeleted }: Props) {
  const { checkPermission, user } = useCurrentUser();
  const addToast = useUiStore((s) => s.addToast);
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [working, setWorking] = useState(false);

  const isPending = receipt.status === 'pending';
  const canApprove = isPending && checkPermission('can_approve_receipts');
  const canReject = isPending && checkPermission('can_reject_receipts');

  const isUploader = user?.email === receipt.uploadedById;
  const canDeleteSelf = isUploader && (receipt.status === 'pending' || receipt.status === 'rejected');
  const canDeleteAdmin = checkPermission('can_manage_members') && receipt.status === 'rejected';
  const canDelete = canDeleteSelf || canDeleteAdmin;

  const handleApprove = async () => {
    setWorking(true);
    try {
      await approveService(receipt.id);
      addToast('已核准收據', 'success');
      onUpdated();
      onClose();
    } catch {
      addToast('核准失敗', 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleReject = async () => {
    if (showRejectInput && !rejectNote.trim()) {
      addToast('請輸入拒絕原因', 'error');
      return;
    }

    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }

    setWorking(true);
    try {
      await rejectService(receipt.id, rejectNote.trim());
      addToast('已拒絕收據', 'info');
      onUpdated();
      onClose();
    } catch {
      addToast('拒絕失敗', 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('確定刪除此收據？刪除後無法恢復。')) return;
    setWorking(true);
    try {
      await deleteService(receipt.id);
      onDeleted();
    } catch {
      addToast('刪除失敗', 'error');
      setWorking(false);
    } finally { setWorking(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">收據詳情</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="receipt-info-grid">
            <div className="info-row">
              <span className="info-label">標題</span>
              <span className="info-value">{receipt.title}</span>
            </div>
            <div className="info-row">
              <span className="info-label">金額</span>
              <span className="info-value">HK${receipt.amount.toLocaleString()}</span>
            </div>
            <div className="info-row">
              <span className="info-label">上傳者</span>
              <span className="info-value">{receipt.uploadedByName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">狀態</span>
              <span className="info-value">
                <Badge
                  text={receipt.status === 'pending' ? '待審核' : receipt.status === 'approved' ? '已核准' : '已拒絕'}
                  variant={receipt.status === 'approved' ? 'success' : receipt.status === 'rejected' ? 'error' : 'warning'}
                />
              </span>
            </div>
            {receipt.note && (
              <div className="info-row">
                <span className="info-label">備註</span>
                <span className="info-value">{receipt.note}</span>
              </div>
            )}
            {receipt.status === 'rejected' && receipt.rejectionNote && (
              <div className="info-row info-row--error">
                <span className="info-label">拒絕原因</span>
                <span className="info-value">{receipt.rejectionNote}</span>
              </div>
            )}
            <div className="info-row">
              <span className="info-label">日期</span>
              <span className="info-value">{new Date(receipt.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* File preview */}
          <div className="receipt-preview">
            {receipt.fileType === 'pdf' ? (
              <a href={receipt.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                開啟 PDF
              </a>
            ) : (
              <img src={receipt.fileUrl} alt="收據圖片" className="receipt-image" />
            )}
          </div>

          {/* Rejection input */}
          {showRejectInput && (
            <div className="reject-input-area">
              <label className="form-label">拒絕原因</label>
              <textarea
                className="form-input"
                rows={3}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="請說明拒絕原因"
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          {canApprove && (
            <button className="btn btn-primary" onClick={handleApprove} disabled={working}>
              {working ? '處理中…' : '核准收據'}
            </button>
          )}
          {canReject && (
            <button className="btn btn-danger" onClick={handleReject} disabled={working}>
              {showRejectInput ? '確認拒絕' : '拒絕此收據'}
            </button>
          )}
          {canDelete && (
            <button className="btn btn-secondary" onClick={handleDelete} disabled={working} style={{ marginLeft: 'auto' }}>
              刪除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}