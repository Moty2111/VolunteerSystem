import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props {
  label: string;
  value: number | string;
  icon?: ReactNode;
  color?: string;
  trend?: { direction: 'up' | 'down'; value: string; text?: string };
  delay?: number;
}

export default function StatCard({ label, value, icon, color, trend, delay = 0 }: Props) {
  const accent = color || 'var(--primary)';
  return (
    <motion.div
      className="stat-card"
      style={{ ['--accent-color' as string]: accent }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
    >
      <span className="accent-bar" style={{ background: accent }} />
      <div className="stat-card-head">
        <div className="stat-card-label">{label}</div>
        {icon && <div className="stat-card-icon">{icon}</div>}
      </div>
      <div className="stat-card-value num">{value}</div>
      {trend && (
        <div className="stat-card-foot">
          <span className={`trend ${trend.direction}`}>
            {trend.direction === 'up' ? '▲' : '▼'} {trend.value}
          </span>
          {trend.text && <span className="trend-text">{trend.text}</span>}
        </div>
      )}
    </motion.div>
  );
}
