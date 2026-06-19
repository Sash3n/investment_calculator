import { type ChangeEvent, type KeyboardEvent, useState, useEffect, useRef, useLayoutEffect } from 'react';
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
  /** Show thousands separators while typing. Defaults to true for Rand (prefix "R") fields. */
  group?: boolean;
}

/** Insert spaces as thousands separators into a sanitized numeric string. */
function groupDigits(s: string): string {
  const neg = s.startsWith('-') ? '-' : '';
  const body = neg ? s.slice(1) : s;
  const sepMatch = body.match(/[.,]/);
  let intPart = body;
  let tail = '';
  if (sepMatch) {
    const idx = body.indexOf(sepMatch[0]);
    intPart = body.slice(0, idx);
    // keep the decimal separator + remaining digits (strip any further separators)
    tail = sepMatch[0] + body.slice(idx + 1).replace(/[.,]/g, '');
  }
  intPart = intPart.replace(/\D/g, '');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return neg + grouped + tail;
}

/** Count digit characters in str up to position pos. */
function digitsBefore(str: string, pos: number): number {
  let n = 0;
  for (let i = 0; i < pos && i < str.length; i++) if (/\d/.test(str[i])) n++;
  return n;
}

/** Find the caret index just after the Nth digit in a formatted string. */
function caretAfterNthDigit(formatted: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let n = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      n++;
      if (n === digitCount) return i + 1;
    }
  }
  return formatted.length;
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
  group,
}: InputFieldProps) {
  const isNumeric = type === 'number';
  const shouldGroup = isNumeric && (group ?? prefix === 'R');
  const fmt = (s: string) => (shouldGroup ? groupDigits(s) : s);

  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);

  // Internal display string — lets user type freely without snapping to 0
  const [display, setDisplay] = useState(() => fmt(String(value)));

  // Restore caret after a grouped reformat changes the string length
  useLayoutEffect(() => {
    if (caretRef.current != null && inputRef.current) {
      const pos = caretRef.current;
      inputRef.current.setSelectionRange(pos, pos);
      caretRef.current = null;
    }
  });

  // Sync when parent resets value externally (e.g. load preset)
  useEffect(() => {
    const incoming = String(value);
    // Only override if the parsed numeric value actually changed to avoid
    // clobbering mid-edit state (e.g. user typed "1," — parsed is still 1)
    const parsedDisplay = parseFloat(display.replace(/\s/g, '').replace(/,/g, '.'));
    const parsedIncoming = parseFloat(incoming);
    if (isNaN(parsedDisplay) || parsedDisplay !== parsedIncoming) {
      setDisplay(fmt(incoming));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!isNumeric) {
      onChange(e.target.value);
      return;
    }

    const raw = e.target.value;
    const selStart = e.target.selectionStart ?? raw.length;

    // Allow: digits, one decimal separator (. or ,), leading minus
    const sanitised = raw.replace(/[^\d.,-]/g, '');

    if (shouldGroup) {
      const formatted = groupDigits(sanitised);
      // Preserve caret by digit count, since grouping shifts characters
      const digitCount = digitsBefore(raw, selStart);
      caretRef.current = caretAfterNthDigit(formatted, digitCount);
      setDisplay(formatted);
    } else {
      setDisplay(sanitised);
    }

    // Normalise for parent: strip spaces (thousand sep) and treat comma as decimal
    const normalised = sanitised.replace(/\s/g, '').replace(/,/g, '.');
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
    const normalised = display.replace(/\s/g, '').replace(/,/g, '.');
    const num = parseFloat(normalised);
    if (isNaN(num) || display.trim() === '') {
      setDisplay(fmt('0'));
      onChange('0');
    } else {
      // Tidy display to the parsed value
      setDisplay(fmt(String(num)));
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
          ref={inputRef}
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
