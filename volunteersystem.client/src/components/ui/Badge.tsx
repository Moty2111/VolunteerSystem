import type { ReactNode } from 'react';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'accent' | 'muted';

interface Props {
  variant?: Variant;
  children: ReactNode;
  icon?: ReactNode;
}

export default function Badge({ variant = 'muted', children, icon }: Props) {
  return (
    <span className={`badge badge-${variant}`}>
      {icon}{children}
    </span>
  );
}
