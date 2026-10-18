import { type ChangeEvent } from 'react';
import clsx from 'clsx';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectFieldProps {
  label: string;
  id: string;
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  help?: string;
  className?: string;
  disabled?: boolean;
}

export function SelectField({
  label,
  id,
  value,
  onChange,
  options,
  help,
  className,
  disabled = false,
}: SelectFieldProps) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-text)' }}
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={clsx('select-dark', disabled && 'opacity-50 cursor-not-allowed')}
        style={{ fontFamily: 'var(--font-text)' }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {help && (
        <p
          className="text-xs leading-relaxed"
          style={{ color: 'var(--ink-subtle)', fontFamily: 'var(--font-text)' }}
        >
          {help}
        </p>
      )}
    </div>
  );
}
