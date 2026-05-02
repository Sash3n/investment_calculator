import { type ChangeEvent, type KeyboardEvent, useState, useEffect } from 'react';
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
  suffix,
  prefix,
  help,
  placeholder,
  className,
  disabled = false,
}: InputFieldProps) {
  const isNumeric = type === 'number';

  // Internal display string — lets user type freely without snapping to 0
  const [display, setDisplay] = useState(String(value));

  // Sync when parent resets value externally (e.g. load preset)
  useEffect(() => {
    const incoming = String(value);
    // Only override if the parsed numeric value actually changed to avoid
    // clobbering mid-edit state (e.g. user typed "1," — parsed is still 1)
    const parsedDisplay = parseFloat(display.replace(/,/g, '.'));
    const parsedIncoming = parseFloat(incoming);
    if (isNaN(parsedDisplay) || parsedDisplay !== parsedIncoming) {
      setDisplay(incoming);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!isNumeric) {
      onChange(e.target.value);
      return;
    }

    const raw = e.target.value;

    // Allow: digits, one decimal separator (. or ,), leading minus
    // Strip any character that isn't a digit, . , or leading -
    const sanitised = raw.replace(/[^\d.,-]/g, '');

    setDisplay(sanitised);

    // Normalise for parent: treat comma as decimal separator only when no
    // period is present and it appears to be a decimal comma (e.g. "1,5")
    // Otherwise strip commas (thousand separators) and parse.
    const normalised = sanitised.replace(/,/g, '.');

    // If multiple periods, keep only the first
    const parts = normalised.split('.');
    const clean = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : normalised;

    if (clean === '' || clean === '-') {
      // Don't push yet — wait for blur
      return;
    }

    const num = parseFloat(clean);
    if (!isNaN(num)) {
      onChange(clean);
    }
  };

  const handleBlur = () => {
    if (!isNumeric) return;
    const normalised = display.replace(/,/g, '.');
    const num = parseFloat(normalised);
    if (isNaN(num) || display.trim() === '') {
      setDisplay('0');
      onChange('0');
    } else {
      // Tidy display to the parsed value
      setDisplay(String(num));
      onChange(String(num));
    }
  };

  // Prevent scroll wheel from changing numeric field values
  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    if (isNumeric) e.currentTarget.blur();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isNumeric) return;
    // Allow: backspace, delete, tab, escape, enter, arrows, home, end, ctrl/cmd combos
    const allowed = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End',
    ];
    if (allowed.includes(e.key)) return;
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase())) return;
    // Allow digits
    if (/^\d$/.test(e.key)) return;
    // Allow decimal separators and minus at start
    if (e.key === '.' || e.key === ',') return;
    if (e.key === '-' && (e.currentTarget.selectionStart === 0)) return;
    e.preventDefault();
  };

  const displayValue = isNumeric ? display : String(value);

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
      >
        {label}
      </label>
      <div className="relative flex items-center">
        {prefix && (
          <span
            className="absolute left-3 text-sm font-semibold select-none pointer-events-none z-10"
            style={{ color: 'var(--color-text-subtle)', fontFamily: 'var(--font-body)' }}
          >
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="text"
          inputMode={isNumeric ? 'decimal' : 'text'}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={(e) => e.target.select()}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={clsx(
            'input-dark',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={{
            fontFamily: 'var(--font-body)',
            paddingLeft: prefix ? '28px' : '14px',
            paddingRight: suffix ? '36px' : '14px',
          }}
        />
        {suffix && (
          <span
            className="absolute right-3 text-sm font-medium select-none pointer-events-none"
            style={{ color: 'var(--color-text-subtle)', fontFamily: 'var(--font-body)' }}
          >
            {suffix}
          </span>
        )}
      </div>
      {help && (
        <p
          className="text-xs leading-relaxed"
          style={{ color: 'var(--color-text-subtle)', fontFamily: 'var(--font-body)' }}
        >
          {help}
        </p>
      )}
    </div>
  );
}
