interface Props {
  value: number;
  variant?: 'default' | 'accent' | 'success';
  height?: number;
}

export default function ProgressBar({ value, variant = 'default', height }: Props) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="progress" style={height ? { height } : undefined}>
      <div
        className={`progress-fill ${variant === 'default' ? '' : variant}`}
        style={{ width: `${v * 100}%` }}
      />
    </div>
  );
}
