import { avatarGradient } from '../../utils/avatar';
import { getInitials } from '../../utils/format';

interface Props {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Avatar({ name, size = 'md' }: Props) {
  return (
    <div
      className={`avatar avatar-${size}`}
      style={{ background: avatarGradient(name) }}
      title={name}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}

export function AvatarGroup({ names, size = 'sm', max = 5 }: { names: string[]; size?: Props['size']; max?: number }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <div className="avatar-group">
      {shown.map((n, i) => <Avatar key={i} name={n} size={size} />)}
      {rest > 0 && (
        <div className="avatar avatar-sm" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>
          +{rest}
        </div>
      )}
    </div>
  );
}
