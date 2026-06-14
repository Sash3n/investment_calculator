import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Receipt, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { InputField } from '../components/ui/InputField';
import { SelectField } from '../components/ui/SelectField';
import { StatCard } from '../components/ui/StatCard';
import { ShareButton } from '../components/ui/ShareButton';
import { formatRand } from '../utils/format';
import { buildShareUrl, readShareParam } from '../utils/share';

const C = {
  indigo:  '#6366F1',
  emerald: '#10B981',
  amber:   '#F59E0B',
  red:     '#EF4444',
  violet:  '#8B5CF6',
};

// 2025/26 SARS tax tables (1 Mar 2025 - 28 Feb 2026)
const TAX_BRACKETS = [
  { limit: 237_100,  rate: 0.18, base: 0         },
  { limit: 370_500,  rate: 0.26, base: 42_678     },
  { limit: 512_800,  rate: 0.31, base: 77_362     },
  { limit: 673_000,  rate: 0.36, base: 121_475    },
  { limit: 857_900,  rate: 0.39, base: 179_147    },
  { limit: 1_817_000,rate: 0.41, base: 251_258    },
  { limit: Infinity, rate: 0.45, base: 644_489    },
];

const PRIMARY_REBATE   = 17_235;
const SECONDARY_REBATE = 9_444;
const TERTIARY_REBATE  = 3_145;
const MEDICAL_CREDIT   = 364;

function calcPAYE(taxable: number, age: number, medAidMembers: number): number {
  const bracket = TAX_BRACKETS.find((b) => taxable <= b.limit) ?? TAX_BRACKETS[TAX_BRACKETS.length - 1];
  const prevLimit = TAX_BRACKETS[TAX_BRACKETS.indexOf(bracket) - 1]?.limit ?? 0;
  const grossTax = bracket.base + (taxable - prevLimit) * bracket.rate;

  let rebate = PRIMARY_REBATE;
  if (age >= 65) rebate += SECONDARY_REBATE;
  if (age >= 75) rebate += TERTIARY_REBATE;

  const medCredit = medAidMembers * MEDICAL_CREDIT * 12;
  return Math.max(0, grossTax - rebate - medCredit);
}

interface ShareState {
  employmentIncome: number;
  freelanceIncome: number;
  otherIncome: number;
  deductions: number;
  age: number;
  medAidMembers: number;
  period: string;
}

export function ProvisionalTax() {
  const shared = readShareParam<ShareState>();

  const [employmentIncome, setEmploymentIncome] = useState(shared?.employmentIncome ?? 0);
  const [freelanceIncome,  setFreelanceIncome]  = useState(shared?.freelanceIncome  ?? 200_000);
  const [otherIncome,      setOtherIncome]      = useState(shared?.otherIncome      ?? 0);
  const [deductions,       setDeductions]       = useState(shared?.deductions       ?? 0);
  const [age,              setAge]              = useState(shared?.age              ?? 30);
  const [medAidMembers,    setMedAidMembers]    = useState(shared?.medAidMembers    ?? 1);
  const [period,           setPeriod]           = useState(shared?.period           ?? 'first');

  const result = useMemo(() => {
    const totalIncome  = employmentIncome + freelanceIncome + otherIncome;
    const taxableIncome = Math.max(0, totalIncome - deductions);
    const annualTax    = calcPAYE(taxableIncome, age, medAidMembers);
    const paye         = calcPAYE(Math.max(0, employmentIncome - deductions), age, medAidMembers);
    const taxOnFreelance = Math.max(0, annualTax - paye);

    const firstPayment  = taxOnFreelance / 2;
    const secondPayment = taxOnFreelance - firstPayment;

    const monthlySetAside = taxOnFreelance / 12;
    const effectiveRate   = taxableIncome > 0 ? (annualTax / taxableIncome) * 100 : 0;

    const penaltyThreshold = taxOnFreelance * 0.9;

    return {
      totalIncome,
      taxableIncome,
      annualTax,
      taxOnFreelance,
      firstPayment,
      secondPayment,
      monthlySetAside,
      effectiveRate,
      penaltyThreshold,
    };
  }, [employmentIncome, freelanceIncome, otherIncome, deductions, age, medAidMembers]);

  const displayPayment = period === 'first' ? result.firstPayment : result.secondPayment;
  const paymentLabel   = period === 'first' ? '1st payment (Aug)' : '2nd payment (Feb)';
  const paymentDue     = period === 'first' ? '31 August' : '28 February';

  const shareUrl = buildShareUrl({
    employmentIncome, freelanceIncome, otherIncome, deductions, age, medAidMembers, period,
  } satisfies ShareState);

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
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Provisional Tax</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Freelancers and side-hustlers: know exactly what to set aside and when. (2025/26)
            </p>
          </div>
        </div>
        <ShareButton url={shareUrl} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div
          className="lg:col-span-1 space-y-4 p-5 rounded-2xl"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Income details
          </h2>

          <InputField
            label="Employment income (annual)"
            value={employmentIncome}
            onChange={setEmploymentIncome}
            prefix="R"
            min={0}
          />
          <InputField
            label="Freelance / side income (annual)"
            value={freelanceIncome}
            onChange={setFreelanceIncome}
            prefix="R"
            min={0}
          />
          <InputField
            label="Other income (interest, rental)"
            value={otherIncome}
            onChange={setOtherIncome}
            prefix="R"
            min={0}
          />
          <InputField
            label="Allowable deductions (RA, etc.)"
            value={deductions}
            onChange={setDeductions}
            prefix="R"
            min={0}
          />
          <InputField label="Your age" value={age} onChange={setAge} suffix="yrs" min={18} max={100} />
          <InputField
            label="Medical aid members (incl. yourself)"
            value={medAidMembers}
            onChange={setMedAidMembers}
            min={0}
            max={10}
          />

          <SelectField
            label="Which provisional payment?"
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'first',  label: '1st payment (due 31 Aug)' },
              { value: 'second', label: '2nd payment (due 28 Feb)' },
            ]}
          />
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label={paymentLabel}
              value={formatRand(displayPayment)}
              color={C.amber}
              icon={<Receipt size={16} />}
            />
            <StatCard
              label="Monthly set aside"
              value={formatRand(result.monthlySetAside)}
              color={C.indigo}
              icon={<CheckCircle2 size={16} />}
            />
            <StatCard
              label="Total tax on freelance income"
              value={formatRand(result.taxOnFreelance)}
              color={C.red}
              icon={<Receipt size={16} />}
            />
            <StatCard
              label="Effective tax rate"
              value={`${result.effectiveRate.toFixed(1)}%`}
              color={C.violet}
              icon={<Info size={16} />}
            />
          </div>

          {/* Due date callout */}
          <div
            className="flex items-start gap-3 p-4 rounded-xl text-sm"
            style={{ background: `${C.amber}11`, border: `1px solid ${C.amber}44` }}
          >
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" style={{ color: C.amber }} />
            <div style={{ color: 'var(--color-text-muted)' }}>
              <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{paymentLabel} due {paymentDue}.</span>
              {' '}Pay at least 90% of your final liability to avoid a 20% penalty on the shortfall.
              Your 90% threshold is {formatRand(result.penaltyThreshold)}.
            </div>
          </div>

          {/* Breakdown table */}
          <div
            className="p-5 rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Tax breakdown</h2>
            <div className="space-y-2 text-sm">
              {[
                ['Total income',           formatRand(result.totalIncome)],
                ['Less deductions',        `- ${formatRand(deductions)}`],
                ['Taxable income',         formatRand(result.taxableIncome)],
                ['Annual tax (SARS table)', formatRand(result.annualTax)],
                ['PAYE already deducted',  `- ${formatRand(calcPAYE(Math.max(0, employmentIncome - deductions), age, medAidMembers))}`],
                ['Tax on non-employment income', formatRand(result.taxOnFreelance)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-1.5"
                  style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                  <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="flex items-start gap-2 p-3 rounded-xl text-xs"
            style={{ background: `${C.indigo}11`, border: `1px solid ${C.indigo}22` }}
          >
            <Info size={13} style={{ color: C.indigo }} />
            <span style={{ color: 'var(--color-text-muted)' }}>
              Based on 2025/26 SARS tax tables. Medical aid credit: R364/member/month.
              Consult a tax practitioner for complex situations.
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
