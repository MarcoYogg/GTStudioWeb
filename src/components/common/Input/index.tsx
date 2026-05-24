import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', ...rest }: Props) {
  return (
    <div className={`form-field ${error ? 'form-field--error' : ''}`}>
      {label && <label className="form-label">{label}</label>}
      <input className={`form-input ${className}`} {...rest} />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}