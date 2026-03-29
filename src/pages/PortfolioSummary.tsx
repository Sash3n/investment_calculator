import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { MapPin, LogIn, TrendingUp, Building2, Wallet, BarChart3, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSavedProperties } from '../hooks/useFirestore';
import { calcPropertyROI } from '../utils/roi';
import { formatRand, formatPercent } from '../utils/format';
import { SectionHeader } from '../components/ui/SectionHeader';
import { StatCard } from '../components/ui/StatCard';
import jsPDF from 'jspdf';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#06B6D4', '#8B5CF6', '#EF4444', '#F97316'];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static p-3 text-xs min-w-[160px]">
      <p className="text-[#94A3B8] mb-2 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="mb-1" style={{ color: p.color ?? p.fill }}>
          {p.name}: {typeof p.value === 'number' ? formatRand(p.value, 0) : p.value}
        </p>
      ))}
    </div>
  );
}

function exportPortfolioPDF(
  props: ReturnType<typeof useSavedProperties>['properties'],
  results: ReturnType<typeof calcPropertyROI>[],
  totals: {
    totalValue: number;
    totalEquity: number;
    totalCashFlow: number;
    totalDebt: number;
    blendedYield: number;
    positive: number;
  }
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const BG: [number,number,number] = [15, 20, 40];
  const SURF: [number,number,number] = [22, 30, 55];
  const MUTED: [number,number,number] = [100, 116, 139];
  const TEXT: [number,number,number] = [241, 245, 249];
  const IND: [number,number,number] = [99, 102, 241];
  const EME: [number,number,number] = [16, 185, 129];
  const RED: [number,number,number] = [239, 68, 68];
  const AMB: [number,number,number] = [245, 158, 11];
  const M = 14, W = 210, H = 297;

  doc.setFillColor(...BG); doc.rect(0, 0, W, H, 'F');
  doc.setFillColor(...SURF); doc.rect(0, 0, W, 28, 'F');
  doc.setFillColor(...IND); doc.rect(0, 26, W, 2, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.setTextColor(...TEXT);
  doc.text('FinCalc ZA', M, 11);
  doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(...MUTED);
  doc.text('Property Portfolio Summary', M, 18.5);
  doc.setFontSize(8);
  doc.text(`Generated ${new Date().toLocaleDateString('en-ZA', { day:'2-digit', month:'short', year:'numeric' })}`, W-M, 11, { align:'right' });
  doc.text(`${props.length} propert${props.length === 1 ? 'y' : 'ies'}`, W-M, 18.5, { align:'right' });

  let y = 36;

  // Totals
  const bw = (W - M*2 - 9) / 4;
  const boxes = [
    { label: 'Portfolio Value', value: formatRand(totals.totalValue, 0), color: IND },
    { label: 'Total Equity',    value: formatRand(totals.totalEquity, 0), color: EME },
    { label: 'Monthly Cash Flow', value: formatRand(totals.totalCashFlow, 0), color: totals.totalCashFlow >= 0 ? EME : RED },
    { label: 'Blended Yield',  value: formatPercent(totals.blendedYield), color: AMB },
  ];
  boxes.forEach((b, i) => {
    const x = M + i * (bw + 3);
    doc.setFillColor(...SURF); doc.roundedRect(x, y, bw, 16, 2, 2, 'F');
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(...MUTED);
    doc.text(b.label.toUpperCase(), x + bw/2, y+5, { align:'center' });
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...b.color);
    doc.text(b.value, x + bw/2, y+12, { align:'center' });
  });
  y += 22;

  // Properties table
  doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...IND);
  doc.text('PROPERTIES', M, y);
  doc.setDrawColor(51,65,85); doc.setLineWidth(0.3);
  doc.line(M, y+1.5, W-M, y+1.5);
  y += 8;

  const cols = [
    { label: 'Property', w: 44 },
    { label: 'Price', w: 30, r: true },
    { label: 'Bond Repmt', w: 28, r: true },
    { label: 'Cash Flow', w: 26, r: true },
    { label: 'Yield', w: 20, r: true },
    { label: '10yr ROI', w: 22, r: true },
    { label: 'Equity', w: 26, r: true },
  ];

  // Table header
  doc.setFillColor(...SURF); doc.rect(M, y, W-M*2, 7, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...MUTED);
  let cx = M+2;
  cols.forEach((c) => {
    if (c.r) doc.text(c.label, cx+c.w-2, y+4.8, { align:'right' });
    else doc.text(c.label, cx, y+4.8);
    cx += c.w;
  });
  y += 7;

  props.forEach((prop, i) => {
    const r = results[i];
    const equity = r.propertyValueYears[0]?.equity ?? r.loanAmount;
    const cf = r.cashFlowS1;

    if (y > H - 20) {
      doc.addPage();
      doc.setFillColor(...BG); doc.rect(0, 0, W, H, 'F');
      y = 14;
    }

    if (i % 2 === 0) { doc.setFillColor(...SURF); doc.rect(M, y, W-M*2, 6.5, 'F'); }
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...TEXT);
    const vals = [
      prop.inputs.propertyName?.substring(0,22) ?? '—',
      formatRand(r.effectivePurchasePrice, 0),
      formatRand(r.monthlyBondRepayment, 0),
      formatRand(cf, 0),
      formatPercent(r.netYieldS1),
      formatPercent(r.roi10YearS1, 1),
      formatRand(equity, 0),
    ];
    cx = M+2;
    cols.forEach((c, ci) => {
      const color: [number,number,number] = ci === 3 ? (cf >= 0 ? EME : RED) : TEXT;
      doc.setTextColor(...color);
      if (c.r) doc.text(vals[ci], cx+c.w-2, y+4.5, { align:'right' });
      else doc.text(vals[ci], cx, y+4.5);
      cx += c.w;
    });
    y += 6.5;
  });

  // Footer
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...MUTED);
    doc.text('FinCalc ZA — for illustrative purposes only. Not financial advice.', M, H-6);
    doc.text(`Page ${p} of ${pages}`, W-M, H-6, { align:'right' });
  }

  doc.save(`FinCalcZA_Portfolio_${new Date().toISOString().slice(0,10)}.pdf`);
}

export function PortfolioSummary() {
  const { user, signIn } = useAuth();
  const { properties, loading } = useSavedProperties(user?.uid ?? null);
  const navigate = useNavigate();

  const results = useMemo(
    () => properties.map((p) => calcPropertyROI(p.inputs)),
    [properties]
  );

  const totals = useMemo(() => {
    if (!results.length) return { totalValue: 0, totalEquity: 0, totalDebt: 0, totalCashFlow: 0, blendedYield: 0, positive: 0, totalCashRequired: 0 };
    const totalValue        = results.reduce((s, r) => s + r.effectivePurchasePrice, 0);
    const totalDebt         = results.reduce((s, r) => s + r.loanAmount, 0);
    const totalEquity       = results.reduce((s, r) => s + (r.propertyValueYears[0]?.equity ?? 0), 0);
    const totalCashFlow     = results.reduce((s, r) => s + r.cashFlowS1, 0);
    const totalCashRequired = results.reduce((s, r) => s + r.totalCashRequired, 0);
    const blendedYield      = totalValue > 0
      ? results.reduce((s, r) => s + r.grossYieldS1 * r.effectivePurchasePrice, 0) / totalValue
      : 0;
    const positive = results.filter((r) => r.cashFlowS1 >= 0).length;
    return { totalValue, totalEquity, totalDebt, totalCashFlow, blendedYield, positive, totalCashRequired };
  }, [results]);

  // Chart data
  const cashFlowData = useMemo(() =>
    properties.map((p, i) => ({
      name: p.inputs.propertyName?.substring(0, 14) ?? `P${i+1}`,
      cashFlow: Math.round(results[i].cashFlowS1),
      fill: results[i].cashFlowS1 >= 0 ? '#10B981' : '#EF4444',
    })), [properties, results]);

  const yieldData = useMemo(() =>
    properties.map((p, i) => ({
      name: p.inputs.propertyName?.substring(0, 14) ?? `P${i+1}`,
      grossYield: +results[i].grossYieldS1.toFixed(2),
      netYield:   +results[i].netYieldS1.toFixed(2),
    })), [properties, results]);

  const equityData = useMemo(() => {
    if (!results.length) return [];
    const maxYears = Math.max(...results.map((r) => r.propertyValueYears.length));
    return Array.from({ length: maxYears }, (_, i) => {
      const entry: Record<string, number | string> = { year: `Yr ${i + 1}` };
      results.forEach((r, pi) => {
        const name = properties[pi].inputs.propertyName?.substring(0, 12) ?? `P${pi+1}`;
        entry[name] = Math.round(r.propertyValueYears[i]?.equity ?? 0);
      });
      return entry;
    });
  }, [results, properties]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-6 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <Building2 size={28} className="text-[#10B981]" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Sign in to view portfolio</h2>
          <p className="text-sm max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
            Your saved properties sync to your account. Sign in to see your portfolio summary.
          </p>
        </div>
        <button onClick={signIn}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
          style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }}>
          <LogIn size={16} /> Sign in with Google
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-6 h-6 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-6 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <MapPin size={28} className="text-[#10B981]" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>No properties saved yet</h2>
          <p className="text-sm max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
            Save properties from the Property ROI calculator to see your portfolio summary here.
          </p>
        </div>
        <button onClick={() => navigate('/property-roi')} className="btn-primary text-sm">
          Go to Property ROI
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto px-4 pt-6 pb-16"
    >
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <SectionHeader
          title="Portfolio Summary"
          subtitle={`${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} · aggregate performance overview`}
          icon={Building2}
        />
        <button
          onClick={() => exportPortfolioPDF(properties, results, totals)}
          className="btn-ghost flex items-center gap-2 text-sm py-2 px-4"
        >
          <FileText size={14} /> Export PDF
        </button>
      </div>

      {/* Aggregate stat cards */}
      <div className="four-col-stats mb-6">
        <StatCard label="Portfolio Value"   value={formatRand(totals.totalValue, 0)}       icon={Building2}  color="indigo" delay={0} />
        <StatCard label="Total Equity"      value={formatRand(totals.totalEquity, 0)}       icon={TrendingUp} color="emerald" delay={0.05} sub={`${formatRand(totals.totalDebt, 0)} debt`} />
        <StatCard label="Monthly Cash Flow" value={formatRand(totals.totalCashFlow, 0)}     icon={Wallet}     color={totals.totalCashFlow >= 0 ? 'emerald' : 'red'} delay={0.1} sub={`${totals.positive}/${properties.length} positive`} />
        <StatCard label="Blended Yield"     value={formatPercent(totals.blendedYield)}      icon={BarChart3}  color="amber" delay={0.15} sub="gross, weighted avg" />
      </div>

      {/* Summary band */}
      <div className="glass-card-static p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Cash Invested',      value: formatRand(totals.totalCashRequired, 0), color: 'var(--color-text)' },
          { label: 'Total Debt',         value: formatRand(totals.totalDebt, 0),         color: '#EF4444' },
          { label: 'Positive CF Props',  value: `${totals.positive} / ${properties.length}`, color: '#10B981' },
          { label: 'Annual Cash Flow',   value: formatRand(totals.totalCashFlow * 12, 0), color: totals.totalCashFlow >= 0 ? '#10B981' : '#EF4444' },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-subtle)', fontFamily: 'var(--font-body)' }}>{s.label}</p>
            <p className="text-sm font-bold" style={{ color: s.color, fontFamily: 'var(--font-heading)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        {/* Cash flow bar */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Monthly Cash Flow by Property
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cashFlowData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => `R${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="cashFlow" radius={[4,4,0,0]} name="Cash Flow">
                {cashFlowData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Yield comparison */}
        <div className="glass-card-static p-5">
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Gross vs Net Yield (%)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={yieldData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} contentStyle={{ background: 'rgba(15,20,40,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12, color: '#F1F5F9' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
              <Bar dataKey="grossYield" name="Gross Yield" fill="#6366F1" radius={[4,4,0,0]} />
              <Bar dataKey="netYield"   name="Net Yield"   fill="#10B981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Equity growth chart */}
      {equityData.length > 0 && (
        <div className="glass-card-static p-5 mb-6">
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Equity Growth Over Time
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={equityData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                {properties.map((_p, i) => (
                  <linearGradient key={i} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={COLORS[i % COLORS.length]} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => `R${(v/1_000_000).toFixed(1)}M`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              {properties.map((p, i) => {
                const name = p.inputs.propertyName?.substring(0, 12) ?? `P${i+1}`;
                return (
                  <Area key={i} type="monotone" dataKey={name}
                    stroke={COLORS[i % COLORS.length]}
                    fill={`url(#grad${i})`}
                    strokeWidth={2} />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-property breakdown table */}
      <div className="glass-card-static overflow-hidden">
        <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Property Breakdown
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="table-dark w-full">
            <thead>
              <tr>
                <th className="text-left">Property</th>
                <th className="text-right">Price</th>
                <th className="text-right">Bond Repmt</th>
                <th className="text-right">Cash Flow</th>
                <th className="text-right">Net Yield</th>
                <th className="text-right">10yr ROI</th>
                <th className="text-right">Equity (now)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {properties.map((prop, i) => {
                const r = results[i];
                const equity = r.propertyValueYears[0]?.equity ?? 0;
                const cf = r.cashFlowS1;
                return (
                  <tr key={prop.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="font-medium truncate max-w-[140px]"
                          style={{ color: 'var(--color-text)' }}>
                          {prop.inputs.propertyName}
                        </span>
                      </div>
                    </td>
                    <td className="text-right">{formatRand(r.effectivePurchasePrice, 0)}</td>
                    <td className="text-right">{formatRand(r.monthlyBondRepayment, 0)}</td>
                    <td className="text-right font-semibold" style={{ color: cf >= 0 ? '#10B981' : '#EF4444' }}>
                      {formatRand(cf, 0)}
                    </td>
                    <td className="text-right">{formatPercent(r.netYieldS1)}</td>
                    <td className="text-right">{formatPercent(r.roi10YearS1, 1)}</td>
                    <td className="text-right" style={{ color: equity >= 0 ? '#10B981' : '#EF4444' }}>
                      {formatRand(equity, 0)}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => navigate('/property-roi', { state: { loadedInputs: prop.inputs } })}
                        className="text-[10px] px-2 py-1 rounded-lg transition-all"
                        style={{ background: 'rgba(99,102,241,0.1)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.2)' }}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid rgba(99,102,241,0.3)' }}>
                <td className="font-bold" style={{ color: 'var(--color-text)' }}>Total</td>
                <td className="text-right font-bold" style={{ color: 'var(--color-text)' }}>{formatRand(totals.totalValue, 0)}</td>
                <td className="text-right font-bold" style={{ color: '#EF4444' }}>
                  {formatRand(results.reduce((s,r) => s + r.monthlyBondRepayment, 0), 0)}
                </td>
                <td className="text-right font-bold" style={{ color: totals.totalCashFlow >= 0 ? '#10B981' : '#EF4444' }}>
                  {formatRand(totals.totalCashFlow, 0)}
                </td>
                <td className="text-right font-bold" style={{ color: '#6366F1' }}>{formatPercent(totals.blendedYield)}</td>
                <td />
                <td className="text-right font-bold" style={{ color: '#10B981' }}>{formatRand(totals.totalEquity, 0)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
