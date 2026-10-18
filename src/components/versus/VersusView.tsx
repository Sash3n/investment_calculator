import { useId } from 'react';
import { Check } from 'lucide-react';
import clsx from 'clsx';
import type { VersusModel } from '../../utils/investing';
import { formatRand, formatYears, formatDate } from '../../utils/format';

const SLIDER_MAX = 20;

interface VersusViewProps {
  model: VersusModel;
  cgtRate: number;
  onReturnChange: (expectedReturn: number) => void;
}

interface SideProps {
  title: string;
  total: number;
  ahead: boolean;
  margin: number;
  lines: { label: string; value: string }[];
  earns: string;
}

/** One of the two equal panels. The leading side gets a heavier border and an "Ahead by" label. */
function Side({ title, total, ahead, margin, lines, earns }: SideProps) {
  return (
    <article
      className={clsx('rounded-2xl p-5 h-full flex flex-col bg-paper-raised', ahead ? 'border-2 border-ink' : 'border border-rule')}
      aria-label={`${title}${ahead ? ', ahead' : ''}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3 min-h-7">
        <h3 className="text-base font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>{title}</h3>
        {ahead && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-ink text-paper whitespace-nowrap">
            <Check size={12} aria-hidden />
            Ahead by {formatRand(margin, 0)}
          </span>
        )}
      </div>
      <p className="text-3xl sm:text-4xl font-semibold text-ink leading-none" style={{ fontFamily: 'var(--font-display)' }}>
        {formatRand(total, 0)}
      </p>
      <p className="text-xs text-ink-subtle mt-1.5">after tax, on the comparison date</p>
      <dl className="mt-4 space-y-1.5 text-sm flex-1">
        {lines.map((l) => (
          <div key={l.label} className="flex justify-between gap-3">
            <dt className="text-ink-muted">{l.label}</dt>
            <dd className="text-ink text-right">{l.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-ink-subtle mt-4 pt-3 border-t border-rule">{earns}</p>
    </article>
  );
}

/**
 * "Pay the bond or invest" as two equal sides, a return slider with the
 * break-even return marked on it, and the assumptions in plain view.
 */
export function VersusView({ model, cgtRate, onReturnChange }: VersusViewProps) {
  const sliderId = useId();
  const noteId = useId();
  const { bond, invest, breakEven } = model;
  const breakEvenOnScale = breakEven !== null && breakEven > 0 && breakEven <= SLIDER_MAX;

  let breakEvenNote: string;
  if (breakEven === null) breakEvenNote = 'Investing would need more than 40% a year to beat paying into the bond.';
  else if (breakEven === 0) breakEvenNote = 'Investing comes out ahead at any return.';
  else breakEvenNote = `Above ${breakEven.toFixed(1)}% a year investing comes out ahead; below it, paying into the bond does.`;

  return (
    <section className="glass-card-static p-5 sm:p-6 space-y-6" aria-labelledby={`${sliderId}-title`}>
      <div>
        <h2 id={`${sliderId}-title`} className="text-xl font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
          Pay into the bond or invest?
        </h2>
        <p className="text-sm text-ink-muted mt-1">
          The same {formatRand(model.extra, 0)} a month either way, compared on {formatDate(model.comparisonDate)}, your original payoff date.
        </p>
      </div>

      {/* Two equal sides */}
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] items-stretch">
        <Side
          title="Pay into the bond"
          total={bond.total}
          ahead={model.winner === 'bond'}
          margin={model.margin}
          lines={[
            { label: 'Bond paid off', value: `${formatDate(bond.payoffDate)} (${formatYears(bond.monthsEarly)} early)` },
            { label: 'Interest saved', value: formatRand(bond.interestSaved, 0) },
            { label: 'Then invests', value: `${formatRand(bond.investsMonthly, 0)} a month` },
          ]}
          earns={`Earns your bond rate of ${bond.rate}% while the bond runs: guaranteed and tax-free.`}
        />
        <div className="hidden sm:flex items-center justify-center text-sm text-ink-subtle" style={{ fontFamily: 'var(--font-display)' }} aria-hidden>
          vs
        </div>
        <Side
          title="Invest it"
          total={invest.total}
          ahead={model.winner === 'investing'}
          margin={model.margin}
          lines={[
            { label: 'Portfolio before tax', value: formatRand(invest.beforeTax, 0) },
            { label: 'CGT on the gain', value: formatRand(invest.cgt, 0) },
            { label: 'Bond paid off', value: formatDate(invest.payoffDate) },
          ]}
          earns={`Earns the ${invest.rate}% a year you assume below. Not guaranteed.`}
        />
      </div>

      {/* Return slider with the break-even marked */}
      <div>
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <label htmlFor={sliderId} className="text-sm font-medium text-ink">Assumed yearly return on investments</label>
          <output htmlFor={sliderId} className="text-lg font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            {invest.rate}%
          </output>
        </div>
        <div className="relative pb-7">
          <input
            id={sliderId}
            type="range"
            min={0}
            max={SLIDER_MAX}
            step={0.25}
            value={Math.min(invest.rate, SLIDER_MAX)}
            onChange={(e) => onReturnChange(parseFloat(e.target.value))}
            aria-describedby={noteId}
            aria-valuetext={`${invest.rate}% a year`}
            className="w-full accent-note-blue cursor-pointer"
          />
          {breakEvenOnScale && (
            <div
              className="absolute top-6 -translate-x-1/2 flex flex-col items-center pointer-events-none"
              style={{ left: `${(breakEven! / SLIDER_MAX) * 100}%` }}
              aria-hidden
            >
              <span className="w-px h-2 bg-ink" />
              <span className="text-[11px] text-ink whitespace-nowrap">Break-even {breakEven!.toFixed(1)}%</span>
            </div>
          )}
          <div className="absolute top-6 inset-x-0 flex justify-between text-[11px] text-ink-subtle pointer-events-none" aria-hidden>
            <span>0%</span>
            <span>{SLIDER_MAX}%</span>
          </div>
        </div>
        <p id={noteId} className="text-sm text-ink-muted">{breakEvenNote}</p>
      </div>

      {/* Assumptions */}
      <div className="rounded-xl bg-paper-sunk p-4">
        <h3 className="text-sm font-semibold text-ink mb-2">What this assumes</h3>
        <ul className="text-sm text-ink-muted space-y-1 list-disc pl-5">
          <li>
            Both routes spend {formatRand(model.standardPayment + model.extra, 0)} a month: your {formatRand(model.standardPayment, 0)} instalment
            plus {formatRand(model.extra, 0)} extra.
          </li>
          <li>The return is an assumption you choose, not a forecast. Real returns go up and down.</li>
          <li>
            {cgtRate > 0
              ? `Investment gains pay CGT at an effective ${cgtRate}% when sold. The annual exclusion is ignored. Interest saved on the bond is tax-free.`
              : 'No tax on investment gains (as in a TFSA). Interest saved on the bond is tax-free.'}
          </li>
          <li>Not included: investment fees, inflation and changes to your bond rate.</li>
        </ul>
      </div>
    </section>
  );
}
