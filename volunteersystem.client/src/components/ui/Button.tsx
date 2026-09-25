import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'accent';
type Size = 'sm' | 'md';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, iconRight, children, className = '', disabled, ...rest },
  ref
) {
  const cls = ['btn', `btn-${variant}`, size === 'sm' ? 'btn-sm' : '', className].filter(Boolean).join(' ');
  return (
    <button ref={ref} className={cls} disabled={disabled || loading} {...rest}>
      {loading ? <span className="spinner" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
});

export default Button;
