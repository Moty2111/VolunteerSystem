import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  iconLeft?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, error, iconLeft, className = '', id, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hasErr = Boolean(error);
  const input = (
    <input
      ref={ref}
      id={inputId}
      className={`input ${hasErr ? 'has-error' : ''} ${className}`}
      aria-invalid={hasErr}
      aria-describedby={error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined}
      {...rest}
    />
  );
  return (
    <div className="field">
      {label && <label className="field-label" htmlFor={inputId}>{label}</label>}
      {iconLeft ? <div className="input-icon-wrap"><span className="input-icon">{iconLeft}</span>{input}</div> : input}
      {hint && !error && <div id={`${inputId}-hint`} className="field-hint">{hint}</div>}
      {error && <div id={`${inputId}-err`} className="field-error">{error}</div>}
    </div>
  );
});

export default Input;
