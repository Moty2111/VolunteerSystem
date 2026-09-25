import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props {
  illustration?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}

export default function EmptyState({ illustration, title, text, action }: Props) {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {illustration && <div className="empty-state-illustration">{illustration}</div>}
      <div className="empty-state-title">{title}</div>
      {text && <div className="empty-state-text">{text}</div>}
      {action && <div className="empty-state-actions">{action}</div>}
    </motion.div>
  );
}
