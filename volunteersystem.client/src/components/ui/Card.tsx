import type { ReactNode, HTMLAttributes } from 'react';

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  children: ReactNode;
  title?: ReactNode;
  action?: ReactNode;
  padded?: boolean;
}

export default function Card({ children, title, action, padded = true, className = '', ...rest }: Props) {
  return (
    <div className={`card ${className}`} style={padded ? undefined : { padding: 0 }} {...rest}>
      {(title || action) && (
        <div className="card-header">
          {typeof title === 'string' ? <h3 className="card-title">{title}</h3> : title}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
