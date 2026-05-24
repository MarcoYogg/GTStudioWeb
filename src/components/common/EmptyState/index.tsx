interface Props {
  message?: string;
  title?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ message = '暫無資料', title = '沒有資料', action }: Props) {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <div className="empty-state-icon" aria-hidden="true">◎</div>
      <div className="empty-state-body">
        <p className="empty-state-title">{title}</p>
        <p className="empty-state-message">{message}</p>
        {action ? <div className="empty-state-action">{action}</div> : null}
      </div>
    </div>
  );
}
