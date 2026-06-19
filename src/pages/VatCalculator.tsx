import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Receipt, Info, ArrowLeftRight, Plus, Trash2 } from 'lucide-react';
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

interface LineItem {
  id:          number;
  description: string;
  amount:      number;
  taxable:     boolean;
}

interface ShareState {
  mode:           string;
  amount:         number;
  annualTurnover: number;
  viewMode:       string;
}

export function VatCalculator() {
  const shared = readShareParam<ShareState>();

  const [mode,           setMode]           = useState<'add' | 'extract'>(shared?.mode as 'add' | 'extract' ?? 'add');
  const [amount,         setAmount]         = useState(shared?.amount         ?? 10_000);
  const [annualTurnover, setAnnualTurnover] = useState(shared?.annualTurnover ?? 0);
  const [viewMode,       setViewMode]       = useState<'simple' | 'invoice'>(
    shared?.viewMode as 'simple' | 'invoice' ?? 'simple',
  );

  // Invoice line items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: 1, description: 'Professional services', amount: 5_000, taxable: true  },
    { id: 2, description: 'Disbursements',         amount: 1_200, taxable: false },
  ]);
  const [nextId, setNextId] = useState(3);

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

  const invoiceTotals = useMemo(() => {
    const taxableExcl = lineItems.filter((l) => l.taxable).reduce((s, l) => s + l.amount, 0);
    const nonTaxable  = lineItems.filter((l) => !l.taxable).reduce((s, l) => s + l.amount, 0);
    const vat         = taxableExcl * VAT_RATE;
    return { taxableExcl, nonTaxable, vat, total: taxableExcl + nonTaxable + vat };
  }, [lineItems]);

  function addLine() {
    setLineItems((prev) => [...prev, { id: nextId, description: '', amount: 0, taxable: true }]);
    setNextId((n) => n + 1);
  }
  function removeLine(id: number) {
    setLineItems((prev) => prev.filter((l) => l.id !== id));
  }
  function updateLine(id: number, field: keyof LineItem, value: string | number | boolean) {
    setLineItems((prev) => prev.map((l) => l.id === id ? { ...l, [field]: value } : l));
  }

  const shareState: ShareState = { mode, amount, annualTurnover, viewMode };

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
              Add or extract 15% VAT — or build a line-item invoice with mixed taxability.
            </p>
          </div>
        </div>
        <ShareButton state={shareState} />
      </div>

      {/* View mode toggle */}
      <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
        {(['simple', 'invoice'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setViewMode(m)}
            className="flex-1 py-3 text-sm font-medium transition-colors"
            style={{
              background: viewMode === m ? C.amber : 'transparent',
              color:      viewMode === m ? '#fff'  : 'var(--color-text-muted)',
            }}
          >
            {m === 'simple' ? 'Simple calculator' : 'Line-item invoice'}
          </button>
        ))}
      </div>

      {viewMode === 'simple' ? (
        /* ── SIMPLE MODE ── */
        <>
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
            {(['add', 'extract'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors"
                style={{
                  background: mode === m ? `${C.amber}33` : 'transparent',
                  color:      mode === m ? C.amber         : 'var(--color-text-muted)',
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
        </>
      ) : (
        /* ── INVOICE MODE ── */
        <div className="space-y-4">
          <div className="p-5 rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Line items</h2>
              <button
                onClick={addLine}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: `${C.amber}22`, color: C.amber }}
              >
                <Plus size={12} />
                Add line
              </button>
            </div>

            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold mb-1"
                style={{ color: 'var(--color-text-muted)' }}>
                <span className="col-span-5">Description</span>
                <span className="col-span-3">Amount (excl. VAT)</span>
                <span className="col-span-2 text-center">Taxable?</span>
                <span className="col-span-1 text-right">VAT</span>
                <span className="col-span-1" />
              </div>

              {lineItems.map((line) => (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-center py-1.5"
                  style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <div className="col-span-5">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                      placeholder="Description"
                      className="w-full px-2 py-1 rounded text-sm"
                      style={{
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                      }}
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={line.amount}
                      min={0}
                      onChange={(e) => updateLine(line.id, 'amount', Number(e.target.value))}
                      className="w-full px-2 py-1 rounded text-sm"
                      style={{
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                      }}
                    />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <button
                      onClick={() => updateLine(line.id, 'taxable', !line.taxable)}
                      className="px-2 py-1 rounded text-xs font-medium transition-colors"
                      style={{
                        background: line.taxable ? `${C.emerald}22` : `${C.amber}22`,
                        color: line.taxable ? C.emerald : C.amber,
                      }}
                    >
                      {line.taxable ? 'Yes' : 'No'}
                    </button>
                  </div>
                  <div className="col-span-1 text-right text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {line.taxable ? formatRand(line.amount * VAT_RATE) : '--'}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeLine(line.id)}>
                      <Trash2 size={13} style={{ color: C.red }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Invoice totals */}
            <div className="mt-4 pt-3 space-y-1.5 text-sm">
              {[
                ['Taxable subtotal (excl. VAT)', formatRand(invoiceTotals.taxableExcl), 'var(--color-text-muted)'],
                ['Non-taxable items',            formatRand(invoiceTotals.nonTaxable),  'var(--color-text-muted)'],
                ['VAT (15%)',                    formatRand(invoiceTotals.vat),          C.amber],
                ['Invoice total (incl. VAT)',    formatRand(invoiceTotals.total),        C.emerald],
              ].map(([label, val, color]) => (
                <div key={label as string} className="flex justify-between items-center py-1"
                  style={{ borderTop: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{label as string}</span>
                  <span style={{ color: color as string, fontWeight: 500 }}>{val as string}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard label="VAT amount"      value={formatRand(invoiceTotals.vat)}   color="amber"   icon={Receipt} />
            <StatCard label="Subtotal excl."  value={formatRand(invoiceTotals.taxableExcl + invoiceTotals.nonTaxable)} color="indigo" icon={Receipt} />
            <StatCard label="Invoice total"   value={formatRand(invoiceTotals.total)} color="emerald" icon={Receipt} />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
            style={{ background: `${C.indigo}11`, border: `1px solid ${C.indigo}22` }}>
            <Info size={13} style={{ color: C.indigo }} />
            <span style={{ color: 'var(--color-text-muted)' }}>
              Toggle "Taxable?" for zero-rated or exempt items (e.g. financial services, residential rent, exports).
              15% VAT applies only to standard-rated supplies.
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
