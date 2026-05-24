import { useState } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import ReceiptUploadForm from '../features/receipts/components/ReceiptUploadForm';
import ReceiptList from '../features/receipts/components/ReceiptList';
import ReceiptReportSection from '../features/receipts/components/ReceiptReportSection';
import ErrorState from '../components/common/ErrorState';

export default function ReceiptsPage() {
  const { user, isLoading, checkPermission } = useCurrentUser();
  const [refreshKey, setRefreshKey] = useState(0);

  const canUpload = checkPermission('can_upload_receipts');
  const canView = checkPermission('can_view_receipts');

  const refresh = () => setRefreshKey((k) => k + 1);

  if (isLoading) {
    return <div className="page"><h1>收據管理</h1><p className="text-muted">載入中…</p></div>;
  }

  if (!canView) {
    return (
      <div className="page">
        <h1>收據管理</h1>
        <ErrorState message="您沒有權限查看收據" />
      </div>
    );
  }

  return (
    <div className="page receipts-page">
      <h1>收據管理</h1>

      <div className="receipts-layout">
        {/* Left column: upload + report */}
        <div className="receipts-sidebar">
          {canUpload && user && (
            <ReceiptUploadForm user={user} onUploaded={refresh} />
          )}
          <ReceiptReportSection />
        </div>

        {/* Right column: list */}
        <div className="receipts-main">
          <ReceiptList refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}