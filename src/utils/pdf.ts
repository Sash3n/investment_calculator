/**
 * FinCalc ZA — PDF Export Utility
 * Uses jsPDF to generate structured, programmatic PDFs for each calculator.
 */

import jsPDF from 'jspdf';
import type { MortgageInputs, MortgageResult, PropertyInputs, PropertyResult, CarInputs, CarResult } from '../types';
import { formatRand, formatPercent, formatYears, formatDate } from './format';

// ── Theme ─────────────────────────────────────────────────────────────────────
const C = {
  bg:       [15, 20, 40]   as [number, number, number],
  surface:  [22, 30, 55]   as [number, number, number],
  border:   [51, 65, 85]   as [number, number, number],
  text:     [241, 245, 249] as [number, number, number],
  muted:    [100, 116, 139] as [number, number, number],
  indigo:   [99, 102, 241] as [number, number, number],
  emerald:  [16, 185, 129] as [number, number, number],
  amber:    [245, 158, 11] as [number, number, number],
  red:      [239, 68, 68]  as [number, number, number],
};

// ── Layout constants ──────────────────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const COL_W = (PAGE_W - MARGIN * 2);

// ── Builder helpers ───────────────────────────────────────────────────────────
function header(doc: jsPDF, title: string, subtitle: string) {
  // Dark header bar
  doc.setFillColor(...C.surface);
  doc.rect(0, 0, PAGE_W, 28, 'F');

  // Accent line
  doc.setFillColor(...C.indigo);
  doc.rect(0, 26, PAGE_W, 2, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...C.text);
  doc.text('FinCalc ZA', MARGIN, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...C.muted);
  doc.text(title, MARGIN, 18.5);

  // Date top-right
  doc.setFontSize(8);
  doc.text(`Generated ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}`, PAGE_W - MARGIN, 11, { align: 'right' });
  doc.text(subtitle, PAGE_W - MARGIN, 18.5, { align: 'right' });

  return 36; // y after header
}

function sectionTitle(doc: jsPDF, y: number, text: string): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.indigo);
  doc.text(text.toUpperCase(), MARGIN, y);

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y + 1.5, PAGE_W - MARGIN, y + 1.5);

  return y + 7;
}

function kvRow(
  doc: jsPDF,
  y: number,
  label: string,
  value: string,
  valueColor: [number, number, number] = C.text,
  bold = false,
): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.muted);
  doc.text(label, MARGIN + 2, y);

  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setTextColor(...valueColor);
  doc.text(value, PAGE_W - MARGIN - 2, y, { align: 'right' });

  return y + 6;
}

function divider(doc: jsPDF, y: number): number {
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y + 4;
}

function twoColKV(
  doc: jsPDF,
  y: number,
  items: { label: string; value: string; color?: [number, number, number] }[],
): number {
  const half = COL_W / 2;
  const ROW_H = 14; // label (5mm) + value (6mm) + gap (3mm)

  for (let i = 0; i < items.length; i += 2) {
    const rowY = y + Math.floor(i / 2) * ROW_H;
    [0, 1].forEach((col) => {
      const item = items[i + col];
      if (!item) return;
      const x = MARGIN + col * (half + 2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.muted);
      doc.text(item.label, x, rowY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...(item.color ?? C.text));
      doc.text(item.value, x, rowY + 6);
    });
  }

  const rows = Math.ceil(items.length / 2);
  return y + rows * ROW_H + 2;
}

function statBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  label: string,
  value: string,
  color: [number, number, number],
) {
  doc.setFillColor(...C.surface);
  doc.roundedRect(x, y, w, 16, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.muted);
  doc.text(label.toUpperCase(), x + w / 2, y + 5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...color);
  doc.text(value, x + w / 2, y + 12, { align: 'center' });
}

function tableHeader(doc: jsPDF, y: number, cols: { label: string; w: number; align?: 'left' | 'right' }[]): number {
  doc.setFillColor(...C.surface);
  doc.rect(MARGIN, y, COL_W, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);

  let x = MARGIN + 2;
  cols.forEach((col) => {
    if (col.align === 'right') {
      doc.text(col.label, x + col.w - 2, y + 4.8, { align: 'right' });
    } else {
      doc.text(col.label, x, y + 4.8);
    }
    x += col.w;
  });
  return y + 7;
}

function tableRow(
  doc: jsPDF,
  y: number,
  cols: { label: string; w: number; align?: 'left' | 'right' }[],
  values: string[],
  shade: boolean,
  color?: [number, number, number],
): number {
  if (shade) {
    doc.setFillColor(22, 30, 55);
    doc.rect(MARGIN, y, COL_W, 5.5, 'F');
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...(color ?? C.text));

  let x = MARGIN + 2;
  cols.forEach((col, i) => {
    if (col.align === 'right') {
      doc.text(values[i] ?? '', x + col.w - 2, y + 4, { align: 'right' });
    } else {
      doc.text(values[i] ?? '', x, y + 4);
    }
    x += col.w;
  });
  return y + 5.5;
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text('FinCalc ZA — for illustrative purposes only. Not financial advice.', MARGIN, PAGE_H - 6);
    doc.text(`Page ${i} of ${pages}`, PAGE_W - MARGIN, PAGE_H - 6, { align: 'right' });
  }
}

function newPage(doc: jsPDF): number {
  doc.addPage();
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  return MARGIN + 4;
}

function checkPage(doc: jsPDF, y: number, needed = 20): number {
  if (y + needed > PAGE_H - 14) return newPage(doc);
  return y;
}

// ─────────────────────────────────────────────────────────────────────────────
// MORTGAGE PDF
// ─────────────────────────────────────────────────────────────────────────────
export function exportMortgagePDF(
  inputs: MortgageInputs,
  result: MortgageResult,
  upfront: { transferDuty: number; bondRegCost: number; totalCashRequired: number },
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  let y = header(
    doc,
    'Mortgage Calculator',
    `${formatRand(result.loanAmount)} @ ${inputs.interestRate}% over ${inputs.termYears} yrs`,
  );

  // ── Key stat boxes ──
  const bw = (COL_W - 9) / 4;
  statBox(doc, MARGIN,           y, bw, 'Loan Amount',    formatRand(result.loanAmount, 0),       C.indigo);
  statBox(doc, MARGIN + bw + 3,  y, bw, 'Monthly Payment', formatRand(result.standardPayment, 0), C.amber);
  statBox(doc, MARGIN + (bw+3)*2,y, bw, 'Total Interest',  formatRand(result.totalInterestStandard, 0), C.red);
  statBox(doc, MARGIN + (bw+3)*3,y, bw, 'Interest Saved',  formatRand(result.interestSaved, 0),   C.emerald);
  y += 22;

  // ── Loan details ──
  y = sectionTitle(doc, y, 'Loan Details');
  y = kvRow(doc, y, 'Purchase Price',   formatRand(inputs.purchasePrice));
  y = kvRow(doc, y, 'Deposit',          `${formatRand(inputs.deposit)} (${((inputs.deposit / inputs.purchasePrice) * 100).toFixed(1)}%)`);
  y = kvRow(doc, y, 'Loan Amount',      formatRand(result.loanAmount), C.indigo, true);
  y = kvRow(doc, y, 'Interest Rate',    formatPercent(inputs.interestRate));
  y = kvRow(doc, y, 'Term',             `${inputs.termYears} years`);
  y = kvRow(doc, y, 'Payment Frequency', inputs.frequency === 'biweekly' ? 'Bi-Weekly (26×/year)' : 'Monthly (12×/year)');
  if (inputs.monthlyServiceFee > 0) {
    y = kvRow(doc, y, 'Monthly Service Fee', formatRand(inputs.monthlyServiceFee));
    y = kvRow(doc, y, 'Effective Monthly Payment', formatRand(result.effectiveMonthlyPayment), C.amber);
    y = kvRow(doc, y, 'Total Service Fees (loan life)', formatRand(result.totalServiceFees), C.red);
  }
  y += 2;

  // ── Repayment summary ──
  y = checkPage(doc, y, 40);
  y = sectionTitle(doc, y, 'Repayment Summary');
  y = kvRow(doc, y, 'Total Paid (Standard)',    formatRand(result.totalPaidStandard));
  y = kvRow(doc, y, 'Total Interest (Standard)', formatRand(result.totalInterestStandard), C.red);
  y = kvRow(doc, y, 'Payoff Date (Standard)',    formatDate(result.payoffDate));
  if (inputs.extraPayment > 0 || inputs.lumpSumAmount > 0) {
    y = divider(doc, y);
    y = kvRow(doc, y, 'Extra Monthly Payment',   formatRand(inputs.extraPayment));
    if (inputs.lumpSumYear > 0) y = kvRow(doc, y, `Lump Sum (Year ${inputs.lumpSumYear})`, formatRand(inputs.lumpSumAmount));
    y = kvRow(doc, y, 'Total Paid (With Extras)',    formatRand(result.totalPaidWithExtras));
    y = kvRow(doc, y, 'Total Interest (With Extras)', formatRand(result.totalInterestWithExtras), C.red);
    y = kvRow(doc, y, 'Interest Saved',               formatRand(result.interestSaved), C.emerald, true);
    y = kvRow(doc, y, 'Time Saved',                   formatYears(result.monthsSaved), C.emerald);
    y = kvRow(doc, y, 'New Payoff Date',               formatDate(result.payoffDateWithExtras), C.emerald);
  }
  y += 2;

  // ── Upfront costs ──
  y = checkPage(doc, y, 35);
  y = sectionTitle(doc, y, 'Upfront Cash Required');
  y = kvRow(doc, y, 'Deposit',           formatRand(inputs.deposit));
  y = kvRow(doc, y, 'Transfer Duty',     inputs.transferDutyExempt ? 'Exempt' : formatRand(upfront.transferDuty), inputs.transferDutyExempt ? C.emerald : C.red);
  y = kvRow(doc, y, 'Bond Registration', inputs.bondRegistrationIncluded ? 'Capitalised into loan' : formatRand(upfront.bondRegCost), inputs.bondRegistrationIncluded ? C.emerald : C.red);
  y = divider(doc, y);
  y = kvRow(doc, y, 'Total Cash Required on Transfer Day', formatRand(upfront.totalCashRequired), C.indigo, true);
  y += 4;

  // ── Amortization schedule (annual summary) ──
  y = checkPage(doc, y, 50);
  y = sectionTitle(doc, y, 'Annual Amortization Summary');

  const cols = [
    { label: 'Year',          w: 14,                        },
    { label: 'Opening Bal.',  w: 36, align: 'right' as const },
    { label: 'Annual Pmt',   w: 32, align: 'right' as const },
    { label: 'Principal',    w: 32, align: 'right' as const },
    { label: 'Interest',     w: 32, align: 'right' as const },
    { label: 'Closing Bal.', w: 36, align: 'right' as const },
  ];
  // Safety: recalculate last col to fill exactly
  cols[5].w = COL_W - cols.slice(0, 5).reduce((s, c) => s + c.w, 0);
  y = tableHeader(doc, y, cols);

  // Build annual rows from monthly amortization
  const amort = result.amortization;
  let annualRows: { year: number; open: number; payment: number; principal: number; interest: number; close: number }[] = [];
  for (let yr = 1; yr <= inputs.termYears; yr++) {
    const months = amort.filter((r) => Math.ceil(r.period / 12) === yr);
    if (!months.length) break;
    annualRows.push({
      year: yr,
      open: months[0].openingBalance,
      payment: months.reduce((s, r) => s + r.totalPayment, 0),
      principal: months.reduce((s, r) => s + r.principal, 0),
      interest: months.reduce((s, r) => s + r.interest, 0),
      close: months[months.length - 1].closingBalance,
    });
  }

  annualRows.forEach((row, i) => {
    y = checkPage(doc, y, 7);
    y = tableRow(doc, y, cols, [
      `Year ${row.year}`,
      formatRand(row.open, 0),
      formatRand(row.payment, 0),
      formatRand(row.principal, 0),
      formatRand(row.interest, 0),
      formatRand(row.close, 0),
    ], i % 2 === 0);
  });

  footer(doc);
  doc.save(`FinCalcZA_Mortgage_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTY ROI PDF
// ─────────────────────────────────────────────────────────────────────────────
export function exportPropertyPDF(inputs: PropertyInputs, result: PropertyResult) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  let y = header(
    doc,
    `Property ROI — ${inputs.propertyName || 'Investment Property'}`,
    `${formatRand(inputs.purchasePrice, 0)} @ ${inputs.interestRate}% / ${inputs.bondTerm} yrs`,
  );

  // ── Key stat boxes ──
  const bw = (COL_W - 9) / 4;
  statBox(doc, MARGIN,            y, bw, 'Loan Amount',     formatRand(result.loanAmount, 0),          C.indigo);
  statBox(doc, MARGIN + bw + 3,   y, bw, 'Bond Repayment',  formatRand(result.monthlyBondRepayment, 0), C.amber);
  statBox(doc, MARGIN + (bw+3)*2, y, bw, 'Cash Flow S1',    formatRand(result.cashFlowS1, 0),           result.cashFlowS1 >= 0 ? C.emerald : C.red);
  statBox(doc, MARGIN + (bw+3)*3, y, bw, 'Gross Yield S1',  formatPercent(result.grossYieldS1),         C.indigo);
  y += 22;

  // ── Property details ──
  y = sectionTitle(doc, y, 'Property Details');
  y = kvRow(doc, y, 'Property Name',        inputs.propertyName || '—');
  if (inputs.discount > 0) {
    y = kvRow(doc, y, 'Listed Price',        formatRand(inputs.purchasePrice));
    y = kvRow(doc, y, 'Discount',            formatPercent(inputs.discount));
    y = kvRow(doc, y, 'Effective Price',     formatRand(result.effectivePurchasePrice), C.emerald);
  } else {
    y = kvRow(doc, y, 'Purchase Price',      formatRand(result.effectivePurchasePrice));
  }
  y = kvRow(doc, y, 'Deposit',               formatRand(inputs.deposit));
  y = kvRow(doc, y, 'Loan Amount',           formatRand(result.loanAmount), C.indigo, true);
  y = kvRow(doc, y, 'Interest Rate',         formatPercent(inputs.interestRate));
  y = kvRow(doc, y, 'Bond Term',             `${inputs.bondTerm} years`);
  y = kvRow(doc, y, 'Monthly Bond Repayment', formatRand(result.monthlyBondRepayment), C.amber, true);
  y += 2;

  // ── Monthly costs & cash flow ──
  y = checkPage(doc, y, 60);
  y = sectionTitle(doc, y, 'Monthly Cash Flow');
  const costRows: [string, string][] = [
    ['Bond Repayment',      formatRand(result.monthlyBondRepayment)],
    ['Levies',              formatRand(inputs.monthlyLevies)],
    ['Rates & Taxes',       formatRand(inputs.monthlyRates)],
    ['Insurance',           formatRand(inputs.insurance)],
  ];
  if (inputs.effluentFees) costRows.push(['Effluent Fees', formatRand(inputs.effluentFees)]);
  if (inputs.miscFees)     costRows.push(['Misc Fees',     formatRand(inputs.miscFees)]);

  costRows.forEach(([l, v]) => { y = kvRow(doc, y, l, v); });

  y = divider(doc, y);
  y = kvRow(doc, y, 'Gross Rent (Scenario 1)',      formatRand(inputs.rentScenario1));
  y = kvRow(doc, y, 'Gross Rent (Scenario 2)',      formatRand(inputs.rentScenario2));
  y = kvRow(doc, y, `Vacancy Rate`,                 formatPercent(inputs.vacancyRate));
  y = kvRow(doc, y, 'Effective Rent S1 (after vacancy)', formatRand(result.monthlyEffectiveRentS1));
  y = kvRow(doc, y, 'Management Fee S1',             formatRand(result.managementFeeS1));
  y = kvRow(doc, y, 'Total Monthly Costs S1',        formatRand(result.totalMonthlyCostsS1), C.red);
  y = kvRow(doc, y, 'Net Cash Flow — Scenario 1',    formatRand(result.cashFlowS1), result.cashFlowS1 >= 0 ? C.emerald : C.red, true);
  y = kvRow(doc, y, 'Net Cash Flow — Scenario 2',    formatRand(result.cashFlowS2), result.cashFlowS2 >= 0 ? C.emerald : C.red, true);
  y += 2;

  // ── Yields & ROI ──
  y = checkPage(doc, y, 45);
  y = sectionTitle(doc, y, 'Yields & ROI');
  y = twoColKV(doc, y, [
    { label: 'Gross Yield S1',   value: formatPercent(result.grossYieldS1),  color: C.indigo },
    { label: 'Gross Yield S2',   value: formatPercent(result.grossYieldS2),  color: C.indigo },
    { label: 'Net Yield S1',     value: formatPercent(result.netYieldS1),    color: result.netYieldS1 >= 0 ? C.emerald : C.red },
    { label: 'Net Yield S2',     value: formatPercent(result.netYieldS2),    color: result.netYieldS2 >= 0 ? C.emerald : C.red },
    { label: '5-Year ROI S1',    value: formatPercent(result.roi5YearS1, 1), color: result.roi5YearS1 >= 0 ? C.emerald : C.red },
    { label: '5-Year ROI S2',    value: formatPercent(result.roi5YearS2, 1), color: result.roi5YearS2 >= 0 ? C.emerald : C.red },
    { label: '10-Year ROI S1',   value: formatPercent(result.roi10YearS1, 1),color: result.roi10YearS1 >= 0 ? C.emerald : C.red },
    { label: '10-Year ROI S2',   value: formatPercent(result.roi10YearS2, 1),color: result.roi10YearS2 >= 0 ? C.emerald : C.red },
  ]);
  y += 2;

  // ── Acquisition costs ──
  y = checkPage(doc, y, 35);
  y = sectionTitle(doc, y, 'Upfront / Acquisition Costs');
  y = kvRow(doc, y, 'Deposit',           formatRand(inputs.deposit));
  y = kvRow(doc, y, 'Transfer Duty',     inputs.transferDutyExempt ? 'Exempt' : formatRand(result.transferDuty), inputs.transferDutyExempt ? C.emerald : C.red);
  y = kvRow(doc, y, 'Bond Registration', inputs.bondRegistrationIncluded ? 'Capitalised' : formatRand(result.bondRegistrationCost), inputs.bondRegistrationIncluded ? C.emerald : C.red);
  y = divider(doc, y);
  y = kvRow(doc, y, 'Total Cash Required', formatRand(result.totalCashRequired), C.indigo, true);
  y += 4;

  // ── 10-year property value projection ──
  y = checkPage(doc, y, 60);
  y = sectionTitle(doc, y, '10-Year Property Value Projection');

  const pvCols = [
    { label: 'Year',           w: 20 },
    { label: 'Property Value', w: 54, align: 'right' as const },
    { label: 'Loan Balance',   w: 54, align: 'right' as const },
    { label: 'Equity',         w: 54, align: 'right' as const },
  ];
  pvCols[3].w = COL_W - pvCols.slice(0, 3).reduce((s, c) => s + c.w, 0);
  y = tableHeader(doc, y, pvCols);

  result.propertyValueYears.forEach((row, i) => {
    y = checkPage(doc, y, 7);
    y = tableRow(doc, y, pvCols, [
      `Year ${row.year}`,
      formatRand(row.value, 0),
      formatRand(row.loanBalance, 0),
      formatRand(row.equity, 0),
    ], i % 2 === 0, row.equity > 0 ? C.text : C.red);
  });

  footer(doc);
  doc.save(`FinCalcZA_PropertyROI_${(inputs.propertyName || 'property').replace(/\s+/g, '-')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CAR FINANCE PDF
// ─────────────────────────────────────────────────────────────────────────────
export function exportCarPDF(inputs: CarInputs, result: CarResult) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  let y = header(
    doc,
    'Car Finance Calculator',
    `${formatRand(inputs.vehiclePrice, 0)} @ ${inputs.interestRate}% over ${inputs.termMonths} months`,
  );

  // ── Key stat boxes ──
  const bw = (COL_W - 9) / 4;
  statBox(doc, MARGIN,            y, bw, 'Financed Amount',   formatRand(result.financedAmount, 0),      C.indigo);
  statBox(doc, MARGIN + bw + 3,   y, bw, 'Monthly Instalment',formatRand(result.monthlyInstalment, 0),   C.amber);
  statBox(doc, MARGIN + (bw+3)*2, y, bw, 'Total Interest',    formatRand(result.totalInterest, 0),       C.red);
  statBox(doc, MARGIN + (bw+3)*3, y, bw, 'Interest Saved',    formatRand(result.interestSaved, 0),       C.emerald);
  y += 22;

  // ── Finance details ──
  y = sectionTitle(doc, y, 'Finance Details');
  y = kvRow(doc, y, 'Vehicle Price',        formatRand(inputs.vehiclePrice));
  y = kvRow(doc, y, 'Deposit',              formatRand(inputs.deposit));
  y = kvRow(doc, y, 'Balloon Payment',      inputs.balloonPercent > 0 ? `${formatPercent(inputs.balloonPercent)} (${formatRand(result.balloonAmount, 0)})` : 'None');
  y = kvRow(doc, y, 'Financed Amount',      formatRand(result.financedAmount), C.indigo, true);
  y = kvRow(doc, y, 'Interest Rate',        formatPercent(inputs.interestRate));
  y = kvRow(doc, y, 'Term',                 `${inputs.termMonths} months`);
  y = kvRow(doc, y, 'Monthly Instalment',   formatRand(result.monthlyInstalment), C.amber, true);
  if (result.instalmentOverride) {
    y = kvRow(doc, y, '  (Bank minimum applied)', '', C.muted);
  }
  if (inputs.monthlyServiceFee > 0) {
    y = kvRow(doc, y, 'Service Fee',              formatRand(inputs.monthlyServiceFee));
    y = kvRow(doc, y, 'Effective Monthly Payment', formatRand(result.effectiveMonthlyPayment), C.amber);
  }
  y += 2;

  // ── Total cost ──
  y = checkPage(doc, y, 45);
  y = sectionTitle(doc, y, 'Total Cost of Finance');
  y = kvRow(doc, y, 'Total Repayments',      formatRand(result.totalRepayments));
  y = kvRow(doc, y, 'Total Interest',        formatRand(result.totalInterest), C.red);
  y = kvRow(doc, y, 'Total Service Fees',    formatRand(result.totalServiceFees));
  y = kvRow(doc, y, 'Total Cost of Ownership', formatRand(result.totalCostOfOwnership), C.red, true);
  y += 2;

  // ── Extra payment impact ──
  if (inputs.extraMonthlyPayment > 0) {
    y = checkPage(doc, y, 35);
    y = sectionTitle(doc, y, 'Extra Payment Impact');
    y = kvRow(doc, y, 'Extra Monthly Payment',  formatRand(inputs.extraMonthlyPayment));
    y = kvRow(doc, y, 'Interest With Extras',   formatRand(result.totalInterestWithExtra), C.red);
    y = kvRow(doc, y, 'Interest Saved',         formatRand(result.interestSaved), C.emerald, true);
    y = kvRow(doc, y, 'Time Saved',             formatYears(result.monthsSaved), C.emerald);
    y = kvRow(doc, y, 'Actual Term',            `${result.actualTermMonths} months`);
    y += 2;
  }

  // ── Running costs ──
  const hasCosts = inputs.monthlyInsurance || inputs.monthlyFuel || inputs.monthlyMaintenance;
  if (hasCosts) {
    y = checkPage(doc, y, 35);
    y = sectionTitle(doc, y, 'Monthly Running Costs');
    if (inputs.monthlyInsurance)    y = kvRow(doc, y, 'Insurance',    formatRand(inputs.monthlyInsurance));
    if (inputs.monthlyFuel)         y = kvRow(doc, y, 'Fuel',         formatRand(inputs.monthlyFuel));
    if (inputs.monthlyMaintenance)  y = kvRow(doc, y, 'Maintenance',  formatRand(inputs.monthlyMaintenance));
    y += 2;
  }

  // ── Depreciation table ──
  y = checkPage(doc, y, 50);
  y = sectionTitle(doc, y, 'Depreciation vs Loan Balance');
  const depCols = [
    { label: 'Year',          w: 20 },
    { label: 'Vehicle Value', w: 54, align: 'right' as const },
    { label: 'Loan Balance',  w: 54, align: 'right' as const },
    { label: 'Equity',        w: 54, align: 'right' as const },
  ];
  depCols[3].w = COL_W - depCols.slice(0, 3).reduce((s, c) => s + c.w, 0);
  y = tableHeader(doc, y, depCols);

  result.depreciation.forEach((row, i) => {
    y = checkPage(doc, y, 7);
    const equity = row.value - row.loanBalance;
    y = tableRow(doc, y, depCols, [
      `Year ${row.year}`,
      formatRand(row.value, 0),
      formatRand(row.loanBalance, 0),
      formatRand(equity, 0),
    ], i % 2 === 0, equity >= 0 ? C.text : C.red);
  });

  footer(doc);
  doc.save(`FinCalcZA_CarFinance_${new Date().toISOString().slice(0, 10)}.pdf`);
}
