import { lineValue, type StatementLine } from './statementText';

/** One statement row: label, dotted leader, figure aligned right. */
export function StatementRow({ line, strong = false }: { line: StatementLine; strong?: boolean }) {
  return (
    <div className={`statement-row ${strong ? 'font-semibold text-ink' : ''}`}>
      <dt>
        <span className="statement-label">
          {line.label}
          {line.note && <span className="block text-xs text-ink-subtle font-normal">{line.note}</span>}
        </span>
        <span className="statement-leader" aria-hidden />
      </dt>
      <dd className={line.kind === 'less' && !strong ? 'text-ink-muted' : 'text-ink'}>{lineValue(line)}</dd>
    </div>
  );
}
