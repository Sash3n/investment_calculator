import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import clsx from 'clsx';

type ColorVariant = 'indigo' | 'amber' | 'emerald' | 'red';

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
  indigo: {
    border: 'border-l-[3px] border-l-[#6366F1]',
    iconBg: 'bg-[rgba(99,102,241,0.12)]',
    iconColor: 'text-[#6366F1]',
    subColor: 'text-[#818CF8]',
  },
  amber: {
    border: 'border-l-[3px] border-l-[#F59E0B]',
    iconBg: 'bg-[rgba(245,158,11,0.12)]',
    iconColor: 'text-[#F59E0B]',
    subColor: 'text-[#FCD34D]',
  },
  emerald: {
    border: 'border-l-[3px] border-l-[#10B981]',
    iconBg: 'bg-[rgba(16,185,129,0.12)]',
    iconColor: 'text-[#10B981]',
    subColor: 'text-[#34D399]',
  },
  red: {
    border: 'border-l-[3px] border-l-[#EF4444]',
    iconBg: 'bg-[rgba(239,68,68,0.12)]',
    iconColor: 'text-[#EF4444]',
    subColor: 'text-[#FCA5A5]',
  },
};

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'indigo',
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
          className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-1"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {label}
        </p>
        <p
          className="text-xl font-bold text-[#F1F5F9] leading-tight truncate"
          style={{ fontFamily: 'var(--font-heading)' }}
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
