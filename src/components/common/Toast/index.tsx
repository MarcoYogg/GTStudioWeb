import { useUiStore } from '../../../store/ui.store';

export default function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <button key={t.id} type="button" className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
          <span className="toast-message">{t.message}</span>
          <span className="toast-dismiss" aria-hidden="true">
            ×
          </span>
        </button>
      ))}
    </div>
  );
}