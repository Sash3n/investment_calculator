import { useId, type ReactNode } from 'react';
import { DisclaimerLink } from '../Disclaimer';

export interface ResultFigure {
  label: string;
  value: string;
}

interface ResultPanelProps {
  /** What the headline figure is, e.g. "Monthly repayment" */
  label: string;
  /** The headline figure, already formatted */
  value: string;
  /** One or two plain sentences saying what the result means */
  summary: ReactNode;
  /** Up to four supporting figures */
  figures?: ResultFigure[];
  /** Colours the headline when it is a gain or a loss */
  tone?: 'default' | 'gain' | 'loss';
  /** When an input needs fixing first: shown instead of the figure and summary */
  blocked?: string;
  className?: string;
}

const toneClass = { default: 'text-ink', gain: 'text-gain-ink', loss: 'text-loss-ink' } as const;

/**
 * The main answer of a calculator: one large figure, a plain-language
 * summary, a few supporting figures and an "Estimate only" note.
 */
export function ResultPanel({ label, value, summary, figures, tone = 'default', blocked, className = '' }: ResultPanelProps) {
  const id = useId();
  if (blocked) {
    return (
      <section className={`glass-card-static p-6 ${className}`} aria-labelledby={id}>
        <h2 id={id} className="text-sm font-medium text-ink-muted">{label}</h2>
        <p className="text-4xl sm:text-5xl font-semibold leading-none mt-2 text-ink-subtle" style={{ fontFamily: 'var(--font-display)' }} aria-hidden>
          —
        </p>
        <p className="text-base text-loss-ink leading-relaxed mt-4 max-w-prose" aria-live="polite">{blocked}</p>
      </section>
    );
  }
  return (
    <section className={`glass-card-static p-6 ${className}`} aria-labelledby={id}>
      <h2 id={id} className="text-sm font-medium text-ink-muted">{label}</h2>
      <p className={`text-4xl sm:text-5xl font-semibold leading-none mt-2 ${toneClass[tone]}`} style={{ fontFamily: 'var(--font-display)' }}>
        {value}
      </p>
      <p className="text-base text-ink-muted leading-relaxed mt-4 max-w-prose" aria-live="polite">{summary}</p>
      {figures && figures.length > 0 && (
        <dl className="grid grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-3 mt-5 pt-4 border-t border-rule">
          {figures.map((f) => (
            <div key={f.label} className="min-w-0">
              <dt className="text-xs text-ink-subtle">{f.label}</dt>
              <dd className="text-base font-semibold text-ink mt-0.5" style={{ fontFamily: 'var(--font-display)' }}>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-xs text-ink-subtle mt-4">
        Estimate only. <DisclaimerLink>Read the disclaimer</DisclaimerLink>
      </p>
    </section>
  );
}
