import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';


interface Props {
  label: string;
  value: number | string;
  icon?: ReactNode;
  color?: string;
  trend?: { direction: 'up' | 'down'; value: string; text?: string };
  delay?: number;
  onClick?: () => void;
}

export default function StatCard({ label, value, icon, color, trend, delay = 0, onClick }: Props) {
  const accent = color || 'var(--primary)';
  return (
    <motion.div
      className={`stat-card${onClick ? ' clickable' : ''}`}
      style={{ ['--accent-color' as string]: accent }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
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
            {trend.direction === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend.value}
          </span>

          {trend.text && <span className="trend-text">{trend.text}</span>}
        </div>
      )}
    </motion.div>
  );
}
