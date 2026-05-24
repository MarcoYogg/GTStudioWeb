interface Props {
  children?: React.ReactNode;
  className?: string;
  label?: string;
}

export default function Loading({ children, className = '', label = '載入中…' }: Props) {
  return (
    <div className={`loading-indicator ${className}`} role="status" aria-live="polite" aria-busy="true">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{children ?? label}</span>
    </div>
  );
}