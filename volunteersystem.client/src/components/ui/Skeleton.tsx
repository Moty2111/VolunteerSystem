interface Props {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: React.CSSProperties;
}

export default function Skeleton({ width = '100%', height = 16, radius = 8, style }: Props) {
  return (
    <span
      className="skeleton"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}
