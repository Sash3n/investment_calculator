import { InputField } from '../ui/InputField';
import { formatRand, formatYears, formatDate } from '../../utils/format';
import type { MortgageInputs, MortgageResult } from '../../types';

/** Quick amounts for the extra monthly payment. */
const EXTRA_CHIPS = [0, 500, 1_000, 2_000, 5_000];

interface MortgageSentenceProps {
  inputs: MortgageInputs;
  result: MortgageResult;
  /** Same setter the full form uses, so both views share one state */
  onChange: (key: keyof MortgageInputs, raw: string) => void;
  /** Validation messages, keyed by input */
  errors?: Partial<Record<keyof MortgageInputs, string>>;
}

/**
 * Simple view: the inputs read as one sentence and the answer is one large
 * monthly figure. Reads and writes the same inputs as the full form.
 */
export function MortgageSentence({ inputs, result, onChange, errors = {} }: MortgageSentenceProps) {
  const messages = Object.values(errors).filter(Boolean);
  const isBiweekly = inputs.frequency === 'biweekly';
  const customExtra = !EXTRA_CHIPS.includes(inputs.extraPayment);
  const hasExtra = inputs.extraPayment > 0 || inputs.lumpSumAmount > 0;

  return (
    <section className="glass-card-static p-6 sm:p-10 max-w-3xl mx-auto" aria-labelledby="mortgage-sentence-title">
      <h2 id="mortgage-sentence-title" className="sr-only">Bond repayment, simple view</h2>

      <p className="text-xl sm:text-2xl leading-[2.2] text-ink" style={{ fontFamily: 'var(--font-display)' }}>
        I&rsquo;m buying a home for{' '}
        <InputField inline id="s-price" label="Purchase price in rand" prefix="R"
          value={inputs.purchasePrice} onChange={(v) => onChange('purchasePrice', v)} error={errors.purchasePrice} />
        {' '}with a deposit of{' '}
        <InputField inline id="s-deposit" label="Deposit in rand" prefix="R"
          value={inputs.deposit} onChange={(v) => onChange('deposit', v)} error={errors.deposit} />.
        {' '}The bond is at{' '}
        <InputField inline id="s-rate" label="Interest rate, percent a year" suffix="%"
          value={inputs.interestRate} onChange={(v) => onChange('interestRate', v)} error={errors.interestRate} />
        {' '}a year over{' '}
        <InputField inline id="s-term" label="Loan term in years"
          value={inputs.termYears} onChange={(v) => onChange('termYears', v)} error={errors.termYears} />
        {' '}years.
      </p>
      {messages.length > 0 && (
        <ul className="mt-3 text-sm font-medium text-loss-ink space-y-1" aria-hidden>
          {messages.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}

      <div className="mt-10" aria-live="polite" aria-atomic="true">
        <p className="text-sm text-ink-muted">Your {isBiweekly ? 'bi-weekly' : 'monthly'} repayment</p>
        <p className="text-6xl sm:text-7xl font-semibold text-ink leading-none mt-2" style={{ fontFamily: 'var(--font-display)' }}>
          {formatRand(result.standardPayment, 0)}
        </p>
        {inputs.monthlyServiceFee > 0 && !isBiweekly && (
          <p className="text-sm text-ink-muted mt-3">
            Plus a {formatRand(inputs.monthlyServiceFee, 0)} service fee: {formatRand(result.effectiveMonthlyPayment, 0)} a month in total.
          </p>
        )}
        <p className="text-sm text-ink-muted mt-1">
          A loan of {formatRand(result.loanAmount, 0)}, paid off in {formatDate(result.payoffDate)}, with {formatRand(result.totalInterestStandard, 0)} interest in total.
        </p>
        <p className="text-xs text-ink-subtle mt-1">Estimate only. Fees and upfront costs are in the full view.</p>
      </div>

      <fieldset className="mt-10">
        <legend className="text-sm font-medium text-ink">Pay extra each month</legend>
        <div className="flex flex-wrap gap-2 mt-3">
          {EXTRA_CHIPS.map((amount) => {
            const active = inputs.extraPayment === amount;
            return (
              <button
                key={amount}
                type="button"
                aria-pressed={active}
                onClick={() => onChange('extraPayment', String(amount))}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${active ? 'bg-ink text-paper border-ink' : 'bg-paper-raised text-ink-muted border-rule hover:border-rule-strong hover:text-ink'}`}
              >
                {amount === 0 ? 'None' : formatRand(amount, 0)}
              </button>
            );
          })}
          {customExtra && (
            <span className="px-3.5 py-1.5 rounded-full text-sm font-medium bg-ink text-paper border border-ink">
              {formatRand(inputs.extraPayment, 0)} (set in the full view)
            </span>
          )}
        </div>
        {hasExtra && result.interestSaved > 0 && (
          <p className="text-sm text-ink-muted mt-3">
            That saves {formatRand(result.interestSaved, 0)} in interest and pays the bond off {formatYears(result.monthsSaved)} sooner,
            in {formatDate(result.payoffDateWithExtras)}.
          </p>
        )}
      </fieldset>
    </section>
  );
}
