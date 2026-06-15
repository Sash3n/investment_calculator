import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Receipt, Info, ArrowLeftRight } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { StatCard } from '../components/ui/StatCard';
import { ShareButton } from '../components/ui/ShareButton';
import { formatRand } from '../utils/format';
import { readShareParam } from '../utils/share';

const C = {
  indigo:  '#6366F1',
  emerald: '#10B981',
  amber:   '#F59E0B',
  red:     '#EF4444',
};

const VAT_RATE          = 0.15;
const VAT_REG_THRESHOLD = 1_000_000;

interface ShareState {
  mode:           string;
  amount:         number;
  annualTurnover: number;
}

export function VatCalculator() {
  const shared = readShareParam<ShareState>();

  const [mode,           setMode]           = useState<'add' | 'extract'>(shared?.mode as 'add' | 'extract' ?? 'add');
  const [amount,         setAmount]         = useState(shared?.amount         ?? 10_000);
  const [annualTurnover, setAnnualTurnover] = useState(shared?.annualTurnover ?? 0);

  const result = useMemo(() => {
    const vatAmount = mode === 'add'
      ? amount * VAT_RATE
      : amount - amount / (1 + VAT_RATE);
    const exclVat = mode === 'add' ? amount           : amount / (1 + VAT_RATE);
    const inclVat = mode === 'add' ? amount + vatAmount : amount;
    const monthsTillRegistration =
      annualTurnover > 0 && annualTurnover < VAT_REG_THRESHOLD
        ? Math.ceil(((VAT_REG_THRESHOLD - annualTurnover) / annualTurnover) * 12)
        : 0;
    return { vatAmount, exclVat, inclVat, monthsTillRegistration };
  }, [mode, amount, annualTurnover]);

  const shareState: ShareState = { mode, amount, annualTurnover };

  return (
    <motion.div
      className="space-y-6 pb-16"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: `${C.amber}22` }}>
            <Receipt size={22} style={{ color: C.amber }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>VAT Calculator</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Add or extract 15% VAT, and check your registration threshold.
            </p>
          </div>
        </div>
        <ShareButton state={shareState} />
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
        {(['add', 'extract'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors"
            style={{
              background: mode === m ? C.amber : 'transparent',
              color:      mode === m ? '#fff'   : 'var(--color-text-muted)',
            }}
          >
            <ArrowLeftRight size={14} />
            {m === 'add' ? 'Add VAT to amount' : 'Extract VAT from amount'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4 p-5 rounded-2xl"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            {mode === 'add' ? 'Amount excl. VAT' : 'Amount incl. VAT'}
          </h2>
          <InputField
            id="vat-amount"
            label={mode === 'add' ? 'Excl. VAT amount (R)' : 'Incl. VAT amount (R)'}
            value={amount}
            onChange={(v) => setAmount(Number(v))}
            prefix="R" min={0}
          />

          <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
            style={{ background: `${C.indigo}11`, border: `1px solid ${C.indigo}22` }}>
            <Info size={13} style={{ color: C.indigo }} />
            <span style={{ color: 'var(--color-text-muted)' }}>SA VAT rate is 15% (effective 1 May 2025).</span>
          </div>

          <hr style={{ borderColor: 'var(--color-border)' }} />

          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            VAT registration check
          </h2>
          <InputField
            id="vat-turnover"
            label="Annual turnover (R)"
            value={annualTurnover}
            onChange={(v) => setAnnualTurnover(Number(v))}
            prefix="R" min={0}
          />

          {annualTurnover >= VAT_REG_THRESHOLD && (
            <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
              style={{ background: `${C.red}11`, border: `1px solid ${C.red}33` }}>
              <Receipt size={13} style={{ color: C.red }} />
              <span style={{ color: 'var(--color-text-muted)' }}>
                Your turnover exceeds R1,000,000 — you must register for VAT within 21 business days.
              </span>
            </div>
          )}
          {annualTurnover > 0 && annualTurnover < VAT_REG_THRESHOLD && result.monthsTillRegistration > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
              style={{ background: `${C.amber}11`, border: `1px solid ${C.amber}33` }}>
              <Info size={13} style={{ color: C.amber }} />
              <span style={{ color: 'var(--color-text-muted)' }}>
                At this run rate you will hit the VAT threshold in approximately{' '}
                {result.monthsTillRegistration} month{result.monthsTillRegistration !== 1 ? 's' : ''}.
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <StatCard label="VAT amount (15%)"    value={formatRand(result.vatAmount)} color="amber"   icon={Receipt} />
            <StatCard label="Amount excl. VAT"    value={formatRand(result.exclVat)}   color="indigo"  icon={Receipt} />
            <StatCard label="Amount incl. VAT"    value={formatRand(result.inclVat)}   color="emerald" icon={Receipt} />
          </div>

          <div className="p-5 rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Quick reference</h2>
            <div className="space-y-0 text-xs">
              {[
                ['VAT rate',                         '15%'],
                ['Mandatory registration threshold', 'R1,000,000 / 12 months'],
                ['Voluntary registration threshold', 'R50,000 / 12 months'],
                ['VAT return periods',               'Monthly or bi-monthly'],
                ['Penalty for late registration',    '10% of VAT owed'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between py-1.5"
                  style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                  <span>{label}</span>
                  <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
