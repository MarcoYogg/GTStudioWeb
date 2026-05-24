interface Props {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = '發生錯誤', onRetry }: Props) {
  return (
    <div className="error-state" role="alert" aria-live="assertive">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          重試
        </button>
      )}
    </div>
  );
}