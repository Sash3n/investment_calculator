import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Receipt, Info, ArrowLeftRight, Plus, Trash2 } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { ShareButton } from '../components/ui/ShareButton';
import { formatRand } from '../utils/format';
import { readShareParam } from '../utils/share';
import { alpha, textTone } from '../utils/color';
import { ResultPanel } from '../components/results/ResultPanel';
import { BreakdownList } from '../components/results/BreakdownList';
import { AssumptionsDrawer } from '../components/results/AssumptionsDrawer';
import { StatementRow } from '../components/statement/StatementRow';
import { nonNegativeError } from '../utils/validation';

const C = {
  blue:  'var(--note-blue)',
  green: 'var(--gain)',
  orange:   'var(--note-orange)',
  red:     'var(--loss)',
};

const VAT_RATE          = 0.15;
// SARS Budget 2026: compulsory registration above R2.3m of taxable supplies in
// 12 months (was R1m), voluntary above R120 000 (was R50 000), from 1 April 2026.
const VAT_REG_THRESHOLD = 2_300_000;
const VAT_VOLUNTARY_THRESHOLD = 120_000;

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

  const errors = {
    amount: nonNegativeError(amount),
    annualTurnover: nonNegativeError(annualTurnover),
  };
  const assumptions = [
    <>VAT is 15% of the price before VAT. To take VAT out of a price that includes it, divide by 1.15.</>,
    <>From 1 April 2026 you must register once taxable supplies pass {formatRand(VAT_REG_THRESHOLD, 0)} in any 12 months, and you may register from {formatRand(VAT_VOLUNTARY_THRESHOLD, 0)}.</>,
    <>The estimate of when you reach the threshold is a rough guide based on the turnover you enter.</>,
    <>On an invoice, mark zero-rated and exempt items as not taxable, such as exports, financial services and residential rent.</>,
  ];

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
                error={errors.amount}
                onChange={(v) => setAmount(Number(v))}
                prefix="R" min={0}
              />

              <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                style={{ background: alpha(C.blue, 7), border: `1px solid ${alpha(C.blue, 13)}` }}>
                <Info size={13} style={{ color: textTone(C.blue) }} />
                <span style={{ color: 'var(--ink-muted)' }}>The SA VAT rate is 15%.</span>
              </div>

              <hr style={{ borderColor: 'var(--rule)' }} />

              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>
                VAT registration check
              </h2>
              <InputField
                id="vat-turnover"
                label="Annual turnover (R)"
                value={annualTurnover}
                error={errors.annualTurnover}
                onChange={(v) => setAnnualTurnover(Number(v))}
                prefix="R" min={0}
              />

              {annualTurnover >= VAT_REG_THRESHOLD && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                  style={{ background: alpha(C.red, 7), border: `1px solid ${alpha(C.red, 20)}` }}>
                  <Receipt size={13} style={{ color: textTone(C.red) }} />
                  <span style={{ color: 'var(--ink-muted)' }}>
                    Your turnover exceeds {formatRand(VAT_REG_THRESHOLD, 0)}, so you must register for VAT within 21 business days.
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
              <ResultPanel
                label={mode === 'add' ? 'Price with VAT' : 'VAT in this price'}
                value={formatRand(mode === 'add' ? result.inclVat : result.vatAmount)}
                blocked={errors.amount}
                summary={mode === 'add'
                  ? `${formatRand(result.exclVat)} plus 15% VAT of ${formatRand(result.vatAmount)} comes to ${formatRand(result.inclVat)}.`
                  : `${formatRand(result.inclVat)} includes ${formatRand(result.vatAmount)} VAT, so the price before VAT is ${formatRand(result.exclVat)}.`}
                figures={[
                  { label: 'VAT', value: formatRand(result.vatAmount) },
                  { label: 'Before VAT', value: formatRand(result.exclVat) },
                  { label: 'With VAT', value: formatRand(result.inclVat) },
                ]}
              />

              <BreakdownList
                title="Quick reference"
                lines={[
                  { label: 'VAT rate', display: '15%' },
                  { label: 'Must register above', display: `${formatRand(VAT_REG_THRESHOLD, 0)} in 12 months` },
                  { label: 'May register from', display: `${formatRand(VAT_VOLUNTARY_THRESHOLD, 0)} in 12 months` },
                  { label: 'VAT returns', display: 'Monthly or every two months' },
                  { label: 'Penalty for registering late', display: '10% of VAT owed' },
                ]}
              />

              <AssumptionsDrawer items={assumptions} />
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
              <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-semibold mb-1" aria-hidden
                style={{ color: 'var(--ink-muted)' }}>
                <span className="col-span-5">Description</span>
                <span className="col-span-3">Amount (excl. VAT)</span>
                <span className="col-span-2 text-center">Taxable?</span>
                <span className="col-span-1 text-right">VAT</span>
                <span className="col-span-1" />
              </div>

              {lineItems.map((line, index) => (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-center py-2 sm:py-1.5"
                  style={{ borderBottom: '1px solid var(--rule)' }}>
                  <div className="col-span-12 sm:col-span-5">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                      aria-label={`Description, line ${index + 1}`}
                      placeholder="Description"
                      className="w-full px-2 py-1 rounded text-sm"
                      style={{
                        background: 'var(--paper)',
                        border: '1px solid var(--rule)',
                        color: 'var(--ink)',
                      }}
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-3">
                    <input
                      type="number"
                      value={line.amount}
                      min={0}
                      onChange={(e) => updateLine(line.id, 'amount', Number(e.target.value))}
                      aria-label={`Amount before VAT, line ${index + 1}`}
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
                      aria-pressed={line.taxable}
                      aria-label={`Taxable, line ${index + 1}`}
                      className="px-2 py-1 rounded text-xs font-medium transition-colors"
                      style={{
                        background: line.taxable ? alpha(C.green, 13) : alpha(C.orange, 13),
                        color: textTone(line.taxable ? C.green : C.orange),
                      }}
                    >
                      {line.taxable ? 'Yes' : 'No'}
                    </button>
                  </div>
                  <div className="col-span-4 sm:col-span-1 text-right text-xs" style={{ color: 'var(--ink-muted)' }}>
                    {line.taxable ? formatRand(line.amount * VAT_RATE) : '--'}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeLine(line.id)} aria-label={`Remove line ${index + 1}`}>
                      <Trash2 size={13} style={{ color: textTone(C.red) }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <dl className="mt-4 pt-3 text-sm border-t border-rule">
              <StatementRow line={{ label: 'Taxable items, before VAT', value: invoiceTotals.taxableExcl }} />
              <StatementRow line={{ label: 'Items without VAT', value: invoiceTotals.nonTaxable }} />
              <StatementRow line={{ label: 'VAT at 15%', value: invoiceTotals.vat }} />
              <div className="border-t border-rule mt-1 pt-1">
                <StatementRow line={{ label: 'Invoice total', value: invoiceTotals.total }} strong />
              </div>
            </dl>
          </div>

          <ResultPanel
            label="Invoice total"
            value={formatRand(invoiceTotals.total)}
            summary={`${formatRand(invoiceTotals.taxableExcl + invoiceTotals.nonTaxable)} before VAT, plus ${formatRand(invoiceTotals.vat)} VAT on the taxable items.`}
            figures={[
              { label: 'VAT', value: formatRand(invoiceTotals.vat) },
              { label: 'Before VAT', value: formatRand(invoiceTotals.taxableExcl + invoiceTotals.nonTaxable) },
              { label: 'Lines', value: String(lineItems.length) },
            ]}
          />

          <AssumptionsDrawer items={assumptions} />
        </div>
      )}
    </motion.div>
  );
}
