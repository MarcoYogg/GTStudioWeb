import type { ReactNode } from 'react';
import { useUiStore } from '../../../store/ui.store';

interface Props {
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}

export default function Modal({ title, children, onClose }: Props) {
  const closeModal = useUiStore((s) => s.closeModal);

  const handleClose = () => {
    if (onClose) onClose();
    else closeModal();
  };

  return (
    <div className="modal-overlay" onClick={handleClose} role="presentation">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title ?? '對話框'}>
        <div className="modal-header">
          {title && <h3 className="modal-title">{title}</h3>}
          <button type="button" className="modal-close" onClick={handleClose} aria-label="關閉視窗">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}