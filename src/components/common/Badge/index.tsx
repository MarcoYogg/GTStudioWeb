interface Props {
  text: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}


const VARIANT_COLORS: Record<string, string> = {
  default: '#888',
  success: '#2d6a4f',
  warning: '#e09f3e',
  error: '#e63946',
  info: '#4361ee',
};

export default function Badge({ text, variant = 'default' }: Props) {
  return (
    <span
      className="badge"
      style={{
        background: VARIANT_COLORS[variant] + '20',
        color: VARIANT_COLORS[variant],
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 500,
      }}
    >
      {text}
    </span>
  );
}