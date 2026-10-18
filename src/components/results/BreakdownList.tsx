import { useId } from 'react';
import { StatementRow } from '../statement/StatementRow';
import type { StatementLine } from '../statement/statementText';

interface BreakdownListProps {
  title: string;
  lines: StatementLine[];
  /** Shown last, in bold, under a rule */
  total?: StatementLine;
  className?: string;
}

/** A titled list of statement rows: labels, dotted leaders, figures aligned right. */
export function BreakdownList({ title, lines, total, className = '' }: BreakdownListProps) {
  const id = useId();
  return (
    <section className={`glass-card-static p-5 ${className}`} aria-labelledby={id}>
      <h3 id={id} className="text-sm font-semibold text-ink mb-2" style={{ fontFamily: 'var(--font-display)' }}>{title}</h3>
      <dl>
        {lines.map((line) => <StatementRow key={line.label} line={line} />)}
        {total && (
          <div className="border-t border-rule mt-1 pt-1">
            <StatementRow line={total} strong />
          </div>
        )}
      </dl>
    </section>
  );
}
