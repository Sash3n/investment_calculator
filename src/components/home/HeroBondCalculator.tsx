import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { InputField } from '../ui/InputField';
import { usePrimeRate } from '../../hooks/usePrimeRate';
import { useCountUp } from '../../hooks/useCountUp';
import { calcPayment } from '../../utils/mortgage';
import { formatRand } from '../../utils/format';
import { DEFAULT_MORTGAGE_INPUTS } from '../../config/calculatorDefaults';

/**
 * A live bond calculator for the home page. The rate follows the prime rate
 * until it is changed. The full calculator opens with the same figures.
 */
export function HeroBondCalculator() {
  const navigate = useNavigate();
  const liveRate = usePrimeRate();
  const [price, setPrice] = useState(DEFAULT_MORTGAGE_INPUTS.purchasePrice);
  const [deposit, setDeposit] = useState(DEFAULT_MORTGAGE_INPUTS.deposit);
  const [rate, setRate] = useState<number | null>(null); // null: follow the prime rate
  const [term, setTerm] = useState(DEFAULT_MORTGAGE_INPUTS.termYears);

  const interestRate = rate ?? liveRate.primeRate;
  const loan = Math.max(0, price - deposit);
  const monthly = calcPayment(loan, interestRate, Math.max(1, term), 12);
  const shown = useCountUp(monthly);

  const openFull = () =>
    navigate('/mortgage', {
      state: { loadedInputs: { ...DEFAULT_MORTGAGE_INPUTS, purchasePrice: price, deposit, interestRate, termYears: term } },
    });

  return (
    <section className="glass-card-static p-6 sm:p-7" aria-labelledby="hero-calc-title">
      <h2 id="hero-calc-title" className="text-base font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
        What would the bond cost?
      </h2>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <InputField id="hero-price" label="Home price" prefix="R" value={price}
          onChange={(v) => setPrice(parseFloat(v) || 0)} />
        <InputField id="hero-deposit" label="Deposit" prefix="R" value={deposit}
          onChange={(v) => setDeposit(parseFloat(v) || 0)} />
        <InputField id="hero-rate" label="Interest rate" suffix="%" value={interestRate}
          onChange={(v) => setRate(parseFloat(v) || 0)}
          help={rate === null ? 'Today’s prime rate' : undefined} />
        <InputField id="hero-term" label="Term" suffix="years" value={term}
          onChange={(v) => setTerm(parseFloat(v) || 0)} />
      </div>

      <div className="mt-6">
        <p className="text-sm text-ink-muted">Monthly repayment</p>
        <p className="text-5xl font-semibold text-ink leading-none mt-1.5" style={{ fontFamily: 'var(--font-display)' }} aria-hidden>
          {formatRand(Math.round(shown), 0)}
        </p>
        <p className="sr-only" aria-live="polite">Monthly repayment {formatRand(monthly, 0)}</p>
        <p className="text-xs text-ink-subtle mt-2">
          On a {formatRand(loan, 0)} loan, before the bank&rsquo;s service fee. Estimate only.
        </p>
      </div>

      <button type="button" onClick={openFull} className="btn-primary mt-5 flex items-center gap-2 text-sm">
        See the full breakdown
        <ArrowRight size={14} aria-hidden />
      </button>
    </section>
  );
}
