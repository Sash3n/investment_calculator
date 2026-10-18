import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import clsx from 'clsx';

type ColorVariant = 'blue' | 'orange' | 'green' | 'red';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  color?: ColorVariant;
  delay?: number;
  className?: string;
}

const colorMap: Record<ColorVariant, { border: string; iconBg: string; iconColor: string; subColor: string }> = {
  blue: {
    border: 'border-l-[3px] border-l-note-blue',
    iconBg: 'bg-note-blue/12',
    iconColor: 'text-note-blue-ink',
    subColor: 'text-note-blue-ink',
  },
  orange: {
    border: 'border-l-[3px] border-l-note-orange',
    iconBg: 'bg-note-orange/12',
    iconColor: 'text-note-orange-ink',
    subColor: 'text-note-orange-ink',
  },
  green: {
    border: 'border-l-[3px] border-l-gain',
    iconBg: 'bg-gain/12',
    iconColor: 'text-gain-ink',
    subColor: 'text-gain-ink',
  },
  red: {
    border: 'border-l-[3px] border-l-loss',
    iconBg: 'bg-loss/12',
    iconColor: 'text-loss-ink',
    subColor: 'text-loss-ink',
  },
};

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'blue',
  delay = 0,
  className,
}: StatCardProps) {
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={clsx('glass-card-static p-5 flex gap-4 items-start', c.border, className)}
    >
      {Icon && (
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', c.iconBg)}>
          <Icon size={18} className={c.iconColor} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-1"
          style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}
        >
          {label}
        </p>
        <p
          className="text-xl font-bold leading-tight truncate"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}
        >
          {value}
        </p>
        {sub && (
          <p className={clsx('text-xs mt-1 font-medium', c.subColor)}>{sub}</p>
        )}
      </div>
    </motion.div>
  );
}
