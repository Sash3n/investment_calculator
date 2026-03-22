import { type ChangeEvent } from 'react';
import clsx from 'clsx';

interface InputFieldProps {
  label: string;
  id: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  step?: number | string;
  min?: number | string;
  max?: number | string;
  suffix?: string;
  prefix?: string;
  help?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function InputField({
  label,
  id,
  value,
  onChange,
  type = 'number',
  step,
  min,
  max,
  suffix,
  prefix,
  help,
  placeholder,
  className,
  disabled = false,
}: InputFieldProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {label}
      </label>
      <div className="relative flex items-center">
        {prefix && (
          <span
            className="absolute left-3 text-[#64748B] text-sm font-semibold select-none pointer-events-none z-10"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {prefix}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={handleChange}
          step={step}
          min={min}
          max={max}
          placeholder={placeholder}
          disabled={disabled}
          className={clsx(
            'input-dark',
            prefix && 'pl-8',
            suffix && 'pr-10',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={{ fontFamily: 'var(--font-body)' }}
        />
        {suffix && (
          <span
            className="absolute right-3 text-[#64748B] text-sm font-medium select-none pointer-events-none"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {suffix}
          </span>
        )}
      </div>
      {help && (
        <p
          className="text-xs text-[#64748B] leading-relaxed"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {help}
        </p>
      )}
    </div>
  );
}
