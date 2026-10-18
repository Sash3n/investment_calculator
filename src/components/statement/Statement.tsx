import { useEffect, useId, useRef, useState } from 'react';
import { Printer, Copy, Check } from 'lucide-react';
import { statementToText, type StatementData } from './statementText';
import { StatementRow as Row } from './StatementRow';

/**
 * A document-style result, like a payslip: rows with leaders, figures aligned
 * right and a highlighted total. Can be printed on its own (or saved as PDF from
 * the print dialog) and copied as plain text.
 */
export function Statement({ data }: { data: StatementData }) {
  const titleId = useId();
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  // Printing copies the statement into a top-level container and hides the app,
  // so only the statement is printed, from the top of the page
  useEffect(() => {
    const done = () => {
      document.body.classList.remove('printing-statement');
      document.getElementById('print-root')?.remove();
    };
    window.addEventListener('afterprint', done);
    return () => window.removeEventListener('afterprint', done);
  }, []);

  const print = () => {
    if (!ref.current) return;
    document.getElementById('print-root')?.remove();
    const holder = document.createElement('div');
    holder.id = 'print-root';
    holder.appendChild(ref.current.cloneNode(true));
    document.body.appendChild(holder);
    document.body.classList.add('printing-statement');
    window.print();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(statementToText(data));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section ref={ref} className="statement glass-card-static p-6 sm:p-8" aria-labelledby={titleId}>
      <header className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b-2 border-ink">
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>{data.title}</h2>
          {data.subtitle && <p className="text-sm text-ink-muted mt-0.5">{data.subtitle}</p>}
        </div>
        <div className="flex flex-wrap gap-2 statement-actions">
          <button type="button" onClick={print} className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 whitespace-nowrap">
            <Printer size={13} aria-hidden /> Print or save as PDF
          </button>
          <button type="button" onClick={copy} className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 whitespace-nowrap" aria-live="polite">
            {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
            {copied ? 'Copied' : 'Copy as text'}
          </button>
        </div>
      </header>

      {data.sections.map((section) => (
        <div key={section.heading} className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-subtle mb-2">{section.heading}</h3>
          <dl>
            {section.lines.map((line) => <Row key={line.label} line={line} />)}
            {section.subtotal && (
              <div className="border-t border-rule mt-1 pt-1">
                <Row line={section.subtotal} strong />
              </div>
            )}
          </dl>
        </div>
      ))}

      <dl className="statement-total mt-6">
        <Row line={data.total} strong />
      </dl>

      {(data.after ?? []).map((section) => (
        <div key={section.heading} className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-subtle mb-2">{section.heading}</h3>
          <dl>{section.lines.map((line) => <Row key={line.label} line={line} />)}</dl>
        </div>
      ))}

      {data.footnote && <p className="text-xs text-ink-subtle mt-4">{data.footnote}</p>}
    </section>
  );
}
