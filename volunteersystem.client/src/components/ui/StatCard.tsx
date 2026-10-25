import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';


interface Props {
  label: string;
  value: number | string;
  icon?: ReactNode;
  color?: string;
  trend?: { direction: 'up' | 'down'; value: string; text?: string };
  delay?: number;
  onClick?: () => void;
  /** Кнопка «Подробнее» в подвале карточки. */
  onDetails?: () => void;
  /** Мини-график (спарклайн) внизу карточки. */
  spark?: number[];
}

export default function StatCard({ label, value, icon, color, trend, delay = 0, onClick, onDetails, spark }: Props) {
  const accent = color || 'var(--primary)';
  /* длинные текстовые значения (уровни, статусы) ужимаются, чтобы не вылезать за карточку */
  const isText = typeof value === 'string' && value.trim().length > 4 && !/^[\d\s.,%чa-zA-Z-]*$/.test(value.trim());

  /* спарклайн: нормализуем по максимуму, рисуем ломаную */
  const sparkPoints = (() => {
    if (!spark || spark.length < 2) return null;
    const max = Math.max(...spark, 1);
    const n = spark.length;
    return spark.map((v, i) => {
      const x = (i / (n - 1)) * 100;
      const y = 26 - (v / max) * 22;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  })();
  return (
    <motion.div
      className={`stat-card${onClick ? ' clickable' : ''}`}
      style={{ ['--accent-color' as string]: accent }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 0.75, 0.3, 1] }}
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
      <div className={`stat-card-value num${isText ? ' is-text' : ''}`}>{value}</div>
      {sparkPoints && (
        <div className="stat-card-spark" aria-hidden="true">
          <svg viewBox="0 0 100 28" preserveAspectRatio="none">
            <polyline
              points={sparkPoints}
              fill="none"
              stroke={accent}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polygon points={`0,28 ${sparkPoints} 100,28`} fill={accent} opacity="0.12" />
          </svg>
        </div>
      )}
      {(trend || onDetails) && (
        <div className="stat-card-foot">
          {trend && (
            <>
              <span className={`trend ${trend.direction}`}>
                {trend.direction === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {trend.value}
              </span>
              {trend.text && <span className="trend-text">{trend.text}</span>}
            </>
          )}
          {onDetails && (
            <button
              type="button"
              className="stat-card-more"
              onClick={e => { e.stopPropagation(); onDetails(); }}
              onKeyDown={e => e.stopPropagation()}
            >
              Подробнее <ArrowRight size={12} />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
