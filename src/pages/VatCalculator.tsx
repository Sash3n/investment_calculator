import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Receipt, Info, ArrowLeftRight, Plus, Trash2 } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { StatCard } from '../components/ui/StatCard';
import { ShareButton } from '../components/ui/ShareButton';
import { formatRand } from '../utils/format';
import { readShareParam } from '../utils/share';
import { alpha, textTone } from '../utils/color';

const C = {
  blue:  'var(--note-blue)',
  green: 'var(--gain)',
  orange:   'var(--note-orange)',
  red:     'var(--loss)',
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
          <div className="p-2.5 rounded-xl" style={{ background: alpha(C.orange, 13) }}>
            <Receipt size={22} style={{ color: textTone(C.orange) }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>VAT Calculator</h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              Add or extract 15% VAT — or build a line-item invoice with mixed taxability.
            </p>
          </div>
        </div>
        <ShareButton state={shareState} />
      </div>

      {/* View mode toggle */}
      <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--rule)' }}>
        {(['simple', 'invoice'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setViewMode(m)}
            className="flex-1 py-3 text-sm font-medium transition-colors"
            style={{
              background: viewMode === m ? C.orange : 'transparent',
              color:      viewMode === m ? 'var(--on-accent)'  : 'var(--ink-muted)',
            }}
          >
            {m === 'simple' ? 'Simple calculator' : 'Line-item invoice'}
          </button>
        ))}
      </div>

      {viewMode === 'simple' ? (
        /* ── SIMPLE MODE ── */
        <>
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--rule)' }}>
            {(['add', 'extract'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors"
                style={{
                  background: mode === m ? alpha(C.orange, 20) : 'transparent',
                  color:      textTone(mode === m ? C.orange         : 'var(--ink-muted)'),
                }}
              >
                <ArrowLeftRight size={14} />
                {m === 'add' ? 'Add VAT to amount' : 'Extract VAT from amount'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4 p-5 rounded-2xl"
              style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>
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
                style={{ background: alpha(C.blue, 7), border: `1px solid ${alpha(C.blue, 13)}` }}>
                <Info size={13} style={{ color: textTone(C.blue) }} />
                <span style={{ color: 'var(--ink-muted)' }}>SA VAT rate is 15% (effective 1 May 2025).</span>
              </div>

              <hr style={{ borderColor: 'var(--rule)' }} />

              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>
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
                  style={{ background: alpha(C.red, 7), border: `1px solid ${alpha(C.red, 20)}` }}>
                  <Receipt size={13} style={{ color: textTone(C.red) }} />
                  <span style={{ color: 'var(--ink-muted)' }}>
                    Your turnover exceeds R1,000,000 — you must register for VAT within 21 business days.
                  </span>
                </div>
              )}
              {annualTurnover > 0 && annualTurnover < VAT_REG_THRESHOLD && result.monthsTillRegistration > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                  style={{ background: alpha(C.orange, 7), border: `1px solid ${alpha(C.orange, 20)}` }}>
                  <Info size={13} style={{ color: textTone(C.orange) }} />
                  <span style={{ color: 'var(--ink-muted)' }}>
                    At this run rate you will hit the VAT threshold in approximately{' '}
                    {result.monthsTillRegistration} month{result.monthsTillRegistration !== 1 ? 's' : ''}.
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <StatCard label="VAT amount (15%)"    value={formatRand(result.vatAmount)} color="orange"   icon={Receipt} />
                <StatCard label="Amount excl. VAT"    value={formatRand(result.exclVat)}   color="blue"  icon={Receipt} />
                <StatCard label="Amount incl. VAT"    value={formatRand(result.inclVat)}   color="green" icon={Receipt} />
              </div>

              <div className="p-5 rounded-2xl"
                style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
                <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Quick reference</h2>
                <div className="space-y-0 text-xs">
                  {[
                    ['VAT rate',                         '15%'],
                    ['Mandatory registration threshold', 'R1,000,000 / 12 months'],
                    ['Voluntary registration threshold', 'R50,000 / 12 months'],
                    ['VAT return periods',               'Monthly or bi-monthly'],
                    ['Penalty for late registration',    '10% of VAT owed'],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between py-1.5"
                      style={{ borderBottom: '1px solid var(--rule)', color: 'var(--ink-muted)' }}>
                      <span>{label}</span>
                      <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{val}</span>
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
            style={{ background: 'var(--paper-raised)', border: '1px solid var(--rule)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Line items</h2>
              <button
                onClick={addLine}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: alpha(C.orange, 13), color: textTone(C.orange) }}
              >
                <Plus size={12} />
                Add line
              </button>
            </div>

            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold mb-1"
                style={{ color: 'var(--ink-muted)' }}>
                <span className="col-span-5">Description</span>
                <span className="col-span-3">Amount (excl. VAT)</span>
                <span className="col-span-2 text-center">Taxable?</span>
                <span className="col-span-1 text-right">VAT</span>
                <span className="col-span-1" />
              </div>

              {lineItems.map((line) => (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-center py-1.5"
                  style={{ borderBottom: '1px solid var(--rule)' }}>
                  <div className="col-span-5">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                      placeholder="Description"
                      className="w-full px-2 py-1 rounded text-sm"
                      style={{
                        background: 'var(--paper)',
                        border: '1px solid var(--rule)',
                        color: 'var(--ink)',
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
                        background: 'var(--paper)',
                        border: '1px solid var(--rule)',
                        color: 'var(--ink)',
                      }}
                    />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <button
                      onClick={() => updateLine(line.id, 'taxable', !line.taxable)}
                      className="px-2 py-1 rounded text-xs font-medium transition-colors"
                      style={{
                        background: line.taxable ? alpha(C.green, 13) : alpha(C.orange, 13),
                        color: textTone(line.taxable ? C.green : C.orange),
                      }}
                    >
                      {line.taxable ? 'Yes' : 'No'}
                    </button>
                  </div>
                  <div className="col-span-1 text-right text-xs" style={{ color: 'var(--ink-muted)' }}>
                    {line.taxable ? formatRand(line.amount * VAT_RATE) : '--'}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeLine(line.id)}>
                      <Trash2 size={13} style={{ color: textTone(C.red) }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Invoice totals */}
            <div className="mt-4 pt-3 space-y-1.5 text-sm">
              {[
                ['Taxable subtotal (excl. VAT)', formatRand(invoiceTotals.taxableExcl), 'var(--ink-muted)'],
                ['Non-taxable items',            formatRand(invoiceTotals.nonTaxable),  'var(--ink-muted)'],
                ['VAT (15%)',                    formatRand(invoiceTotals.vat),          C.orange],
                ['Invoice total (incl. VAT)',    formatRand(invoiceTotals.total),        C.green],
              ].map(([label, val, color]) => (
                <div key={label as string} className="flex justify-between items-center py-1"
                  style={{ borderTop: '1px solid var(--rule)' }}>
                  <span style={{ color: 'var(--ink-muted)' }}>{label as string}</span>
                  <span style={{ color: textTone(color as string), fontWeight: 500 }}>{val as string}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard label="VAT amount"      value={formatRand(invoiceTotals.vat)}   color="orange"   icon={Receipt} />
            <StatCard label="Subtotal excl."  value={formatRand(invoiceTotals.taxableExcl + invoiceTotals.nonTaxable)} color="blue" icon={Receipt} />
            <StatCard label="Invoice total"   value={formatRand(invoiceTotals.total)} color="green" icon={Receipt} />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
            style={{ background: alpha(C.blue, 7), border: `1px solid ${alpha(C.blue, 13)}` }}>
            <Info size={13} style={{ color: textTone(C.blue) }} />
            <span style={{ color: 'var(--ink-muted)' }}>
              Toggle "Taxable?" for zero-rated or exempt items (e.g. financial services, residential rent, exports).
              15% VAT applies only to standard-rated supplies.
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
