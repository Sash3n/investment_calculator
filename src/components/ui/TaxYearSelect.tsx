import { SelectField } from './SelectField';
import { TAX_YEAR_OPTIONS, type TaxYearId } from '../../config/taxYears';

interface TaxYearSelectProps {
  value: TaxYearId;
  onChange: (year: TaxYearId) => void;
  id?: string;
  className?: string;
}

/**
 * Reusable SARS tax-year selector. Shows "2026/2027" style labels with the
 * tax-year period as help text. Wraps the standard SelectField styling.
 */
export function TaxYearSelect({ value, onChange, id = 'tax-year', className }: TaxYearSelectProps) {
  const selected = TAX_YEAR_OPTIONS.find((o) => o.id === value);
  return (
    <SelectField
      label="Tax year"
      id={id}
      value={value}
      onChange={(v) => onChange(v as TaxYearId)}
      options={TAX_YEAR_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
      help={selected ? selected.period : undefined}
      className={className}
    />
  );
}
