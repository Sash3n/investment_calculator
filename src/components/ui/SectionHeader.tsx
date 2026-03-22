import { type LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  className?: string;
}

export function SectionHeader({ title, subtitle, icon: Icon, className }: SectionHeaderProps) {
  return (
    <div className={clsx('mb-6', className)}>
      <div className="flex items-center gap-3 mb-1">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-[rgba(99,102,241,0.15)] flex items-center justify-center flex-shrink-0">
            <Icon size={18} className="text-[#6366F1]" />
          </div>
        )}
        <h2
          className="text-2xl font-bold"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}
        >
          {title}
        </h2>
      </div>
      {/* Accent underline */}
      <div
        className="h-[2px] rounded-full mt-2 mb-3"
        style={{
          background: 'linear-gradient(90deg, #6366F1 0%, rgba(99,102,241,0.2) 60%, transparent 100%)',
          marginLeft: Icon ? '48px' : '0',
          width: '120px',
        }}
      />
      {subtitle && (
        <p
          className="text-sm"
          style={{
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-body)',
            marginLeft: Icon ? '48px' : '0',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
