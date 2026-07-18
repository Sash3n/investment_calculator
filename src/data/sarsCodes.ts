/**
 * FinCalc ZA — SARS source code registry
 *
 * IRP5/IT3(a) and investment (IT3(b)) source codes as published in the SARS
 * "Guide for Codes Applicable to Employees Tax Certificates" (PAYE-AE-06-G06).
 * These codes are stable across tax years.
 *
 * Each code declares how the SARS Assessment estimator uses it via `mapsTo`:
 *  - a TaxAssessmentInputs field name: the amount is added into that field
 *  - null: informational only (non-taxable, employer-only, totals, or items
 *    the estimator does not model) — the description explains why
 */

import type { TaxAssessmentInputs } from '../types';

export type SarsCodeCategory =
  | 'income'        // 36xx normal remuneration
  | 'allowance'     // 37xx allowances
  | 'fringe'        // 38xx fringe benefits
  | 'lumpsum'       // 39xx lump sums
  | 'deduction'     // 40xx employee deductions
  | 'employer'      // 44xx employer contributions (informational)
  | 'tax-paid'      // 41xx tax withheld
  | 'investment';   // 42xx investment income (IT3(b) / ITR12)

/** Assessment fields a code can feed. */
export type AssessmentCodeField = Extract<keyof TaxAssessmentInputs,
  | 'annualSalary' | 'travelAllowance' | 'otherIncome' | 'raContributions'
  | 'medAidContributions' | 'donations' | 'payeWithheld' | 'interestIncome'>;

export interface SarsCode {
  code: string;
  label: string;
  description: string;
  category: SarsCodeCategory;
  mapsTo: AssessmentCodeField | null;
  /** Extra search terms beyond code + label. */
  keywords?: string;
}

export const CATEGORY_LABELS: Record<SarsCodeCategory, string> = {
  income:     'Income (36xx)',
  allowance:  'Allowances (37xx)',
  fringe:     'Fringe Benefits (38xx)',
  lumpsum:    'Lump Sums (39xx)',
  deduction:  'Deductions (40xx)',
  employer:   'Employer Contributions (44xx)',
  'tax-paid': 'Tax Withheld (41xx)',
  investment: 'Investment Income (42xx)',
};

export const SARS_CODES: SarsCode[] = [
  // ── Income (36xx) ───────────────────────────────────────────────────────────
  { code: '3601', label: 'Income (salary)', category: 'income', mapsTo: 'annualSalary',
    description: 'Normal taxable salary or wages.', keywords: 'basic pay wages remuneration' },
  { code: '3602', label: 'Income (non-taxable)', category: 'income', mapsTo: null,
    description: 'Non-taxable income, e.g. reimbursements of business expenses. Not included in the assessment.', keywords: 'exempt' },
  { code: '3603', label: 'Pension income', category: 'income', mapsTo: 'annualSalary',
    description: 'Pension paid from a pension fund. Taxed as ordinary income.', keywords: 'retired pensioner' },
  { code: '3605', label: 'Annual payment (bonus)', category: 'income', mapsTo: 'annualSalary',
    description: 'Bonus, 13th cheque, leave encashment or other annual payments.', keywords: 'thirteenth cheque leave pay' },
  { code: '3606', label: 'Commission', category: 'income', mapsTo: 'annualSalary',
    description: 'Commission income. If it exceeds 50% of total remuneration, business-type expenses may be claimable — consult a practitioner.', keywords: 'sales' },
  { code: '3607', label: 'Overtime', category: 'income', mapsTo: 'annualSalary',
    description: 'Overtime payments. Fully taxable as income.' },
  { code: '3610', label: 'Annuity from retirement fund', category: 'income', mapsTo: 'annualSalary',
    description: 'Living/life annuity paid by a retirement annuity fund. Taxed as ordinary income.', keywords: 'living annuity' },
  { code: '3611', label: 'Purchased annuity (taxable portion)', category: 'income', mapsTo: 'annualSalary',
    description: 'Taxable portion of a purchased annuity.', },
  { code: '3615', label: "Director's remuneration", category: 'income', mapsTo: 'annualSalary',
    description: 'Remuneration of a director of a company or member of a CC.', keywords: 'member cc' },
  { code: '3616', label: 'Independent contractor', category: 'income', mapsTo: 'annualSalary',
    description: 'Income as an independent contractor subject to PAYE. Business expenses may be deductible — consult a practitioner.', keywords: 'freelance consultant' },
  { code: '3617', label: 'Labour broker', category: 'income', mapsTo: 'annualSalary',
    description: 'Payments to a labour broker (with IRP30 exemption certificate: no PAYE).', },
  { code: '3651', label: 'Foreign income (salary)', category: 'income', mapsTo: 'annualSalary',
    description: 'Foreign-sourced salary (foreign services rendered). The s10(1)(o)(ii) exemption up to R1.25m may apply — not modelled here.', keywords: 'expat abroad' },
  { code: '3697', label: 'Gross retirement funding income', category: 'income', mapsTo: null,
    description: 'Pre-2017 informational total. Do not add — it duplicates the individual income codes.', keywords: 'total' },
  { code: '3698', label: 'Gross non-retirement funding income', category: 'income', mapsTo: null,
    description: 'Pre-2017 informational total. Do not add — it duplicates the individual income codes.', keywords: 'total' },
  { code: '3699', label: 'Gross employment income (total)', category: 'income', mapsTo: 'annualSalary',
    description: 'The TOTAL of all taxable income codes on the IRP5. Enter EITHER this total OR the individual 36xx/37xx/38xx codes — never both, or income is double-counted.', keywords: 'gross total taxtim' },

  // ── Allowances (37xx) ───────────────────────────────────────────────────────
  { code: '3701', label: 'Travel allowance', category: 'allowance', mapsTo: 'travelAllowance',
    description: 'Fixed travel allowance. 80% is taxable by default (20% with high business use); claim actual business travel with a logbook on assessment.', keywords: 'car motor vehicle logbook' },
  { code: '3702', label: 'Reimbursive travel (taxable)', category: 'allowance', mapsTo: 'travelAllowance',
    description: 'Reimbursed kilometres above the SARS prescribed rate, or with other travel remuneration. Treated as a travel allowance.', keywords: 'kilometres km rate' },
  { code: '3703', label: 'Reimbursive travel (non-taxable)', category: 'allowance', mapsTo: null,
    description: 'Reimbursed kilometres at or below the prescribed rate. Not taxable — excluded from the assessment.', keywords: 'kilometres km' },
  { code: '3704', label: 'Subsistence allowance (taxable)', category: 'allowance', mapsTo: 'annualSalary',
    description: 'Local subsistence allowance exceeding the deemed SARS limits. Taxable.', keywords: 'per diem travel' },
  { code: '3705', label: 'Subsistence allowance (non-taxable)', category: 'allowance', mapsTo: null,
    description: 'Local subsistence within the deemed SARS limits. Not taxable — excluded.', keywords: 'per diem' },
  { code: '3713', label: 'Other allowances (taxable)', category: 'allowance', mapsTo: 'annualSalary',
    description: 'Other taxable allowances, e.g. cellphone, tool or entertainment allowances.', keywords: 'cellphone entertainment' },
  { code: '3714', label: 'Other allowances (non-taxable)', category: 'allowance', mapsTo: null,
    description: 'Other non-taxable allowances, e.g. uniform allowance. Excluded.', keywords: 'uniform' },
  { code: '3717', label: 'Broad-based employee share plan', category: 'allowance', mapsTo: 'annualSalary',
    description: 'Taxable amount from a s8B broad-based employee share plan.', keywords: 'shares equity' },

  // ── Fringe benefits (38xx) ──────────────────────────────────────────────────
  { code: '3801', label: 'General fringe benefits', category: 'fringe', mapsTo: 'annualSalary',
    description: 'Taxable value of assets acquired below actual value (general fringe benefit).', keywords: 'asset' },
  { code: '3802', label: 'Use of motor vehicle', category: 'fringe', mapsTo: 'annualSalary',
    description: 'Taxable value of the right of use of an employer-provided vehicle. Part may be claimable with a logbook on assessment.', keywords: 'company car' },
  { code: '3805', label: 'Accommodation', category: 'fringe', mapsTo: 'annualSalary',
    description: 'Taxable value of free or cheap residential accommodation.', keywords: 'housing' },
  { code: '3806', label: 'Services', category: 'fringe', mapsTo: 'annualSalary',
    description: 'Taxable value of free or cheap services provided by the employer.' },
  { code: '3808', label: "Employee's debt paid", category: 'fringe', mapsTo: 'annualSalary',
    description: "Taxable value of an employee's debt settled by the employer (incl. certain study loans).", keywords: 'loan' },
  { code: '3810', label: 'Medical aid paid by employer', category: 'fringe', mapsTo: 'annualSalary',
    description: 'Fringe benefit: medical scheme contributions the employer paid for you. Taxable as income, but the same amount is treated as YOUR contribution (usually shown under 4005) for the medical credits.', keywords: 'medical scheme contribution fringe' },
  { code: '3813', label: 'Medical costs paid by employer', category: 'fringe', mapsTo: 'annualSalary',
    description: 'Fringe benefit: medical costs (not scheme contributions) paid by the employer on your behalf.', },
  { code: '3816', label: 'Vehicle (operating lease)', category: 'fringe', mapsTo: 'annualSalary',
    description: 'Taxable value of use of a vehicle the employer holds under an operating lease.', keywords: 'company car rental' },

  // ── Lump sums (39xx) ────────────────────────────────────────────────────────
  { code: '3901', label: 'Gratuity / severance benefit', category: 'lumpsum', mapsTo: null,
    description: 'Retrenchment or retirement severance. Taxed separately on the retirement lump-sum tables (first R550,000 at 0%) — NOT included in this estimate. The PAYE on it appears under 4115.', keywords: 'retrenchment severance package' },
  { code: '3907', label: 'Other lump sums', category: 'lumpsum', mapsTo: null,
    description: 'Other lump sums, e.g. backdated salaries, taxed per SARS directive. Not modelled in this estimate.', },
  { code: '3915', label: 'Retirement fund lump sum', category: 'lumpsum', mapsTo: null,
    description: 'Lump sum from a pension/provident/RA fund on retirement or withdrawal. Taxed separately on the SARS lump-sum tables — not modelled here.', keywords: 'withdrawal pension provident' },

  // ── Deductions (40xx) ───────────────────────────────────────────────────────
  { code: '4001', label: 'Pension fund (current)', category: 'deduction', mapsTo: 'raContributions',
    description: 'Your current pension fund contributions. Counts toward the s11F retirement deduction (27.5%, capped).', keywords: 'retirement 11f' },
  { code: '4002', label: 'Pension fund (arrears)', category: 'deduction', mapsTo: 'raContributions',
    description: 'Arrear pension fund contributions. Counts toward the s11F retirement deduction.', },
  { code: '4003', label: 'Provident fund', category: 'deduction', mapsTo: 'raContributions',
    description: 'Current and arrear provident fund contributions. Counts toward the s11F retirement deduction.', keywords: 'retirement 11f' },
  { code: '4005', label: 'Medical scheme contributions', category: 'deduction', mapsTo: 'medAidContributions',
    description: 'Medical scheme contributions (yours, including amounts the employer paid shown as a 3810 fringe benefit). Drives the s6A/s6B medical credits.', keywords: 'medical aid s6a' },
  { code: '4006', label: 'Retirement annuity (current)', category: 'deduction', mapsTo: 'raContributions',
    description: 'Current retirement annuity contributions. Counts toward the s11F retirement deduction (27.5%, capped).', keywords: 'ra 11f' },
  { code: '4007', label: 'Retirement annuity (arrears)', category: 'deduction', mapsTo: 'raContributions',
    description: 'Arrear/reinstated RA contributions. Counts toward the s11F retirement deduction.', keywords: 'ra' },
  { code: '4024', label: 'Medical costs (own)', category: 'deduction', mapsTo: null,
    description: 'Medical costs you paid, recovered from the employer. Enter qualifying out-of-pocket costs in the Medical section instead to avoid double counting.', },
  { code: '4030', label: 'Donations via employer (S18A)', category: 'deduction', mapsTo: 'donations',
    description: 'S18A donations deducted from your salary by the employer. Capped at 10% of taxable income.', keywords: 'charity giving' },
  { code: '4497', label: 'Total deductions', category: 'deduction', mapsTo: null,
    description: 'The TOTAL of all deduction codes. Informational — enter the individual 40xx codes instead.', keywords: 'total' },

  // ── Employer contributions (44xx) — informational ───────────────────────────
  { code: '4472', label: "Employer's pension contributions", category: 'employer', mapsTo: null,
    description: 'Employer pension contributions. Already reflected as a fringe benefit plus deemed employee contribution on the IRP5 — no extra entry needed.', },
  { code: '4473', label: "Employer's provident contributions", category: 'employer', mapsTo: null,
    description: 'Employer provident contributions. Already reflected on the IRP5 — no extra entry needed.', },
  { code: '4474', label: "Employer's medical contributions", category: 'employer', mapsTo: null,
    description: 'Employer medical scheme contributions. The taxable part is the 3810 fringe benefit; the deemed contribution sits in 4005.', },
  { code: '4475', label: "Employer's RA contributions", category: 'employer', mapsTo: null,
    description: 'Employer retirement annuity contributions. Already reflected on the IRP5 — no extra entry needed.', },

  // ── Tax withheld (41xx) ─────────────────────────────────────────────────────
  { code: '4102', label: 'PAYE', category: 'tax-paid', mapsTo: 'payeWithheld',
    description: 'Employees’ tax withheld during the year — the amount reconciled against your final liability for the refund/owing estimate.', keywords: 'pay as you earn withheld irp5' },
  { code: '4115', label: 'PAYE on lump sums', category: 'tax-paid', mapsTo: 'payeWithheld',
    description: 'Tax withheld on retirement lump sums / severance (3901/3915). Only add it if you also account for the lump sum separately — this estimator does not model lump-sum tax.', keywords: 'directive severance' },
  { code: '4116', label: 'Medical scheme fees tax credit', category: 'tax-paid', mapsTo: null,
    description: 'The s6A credit your employer applied monthly in PAYE. Informational — the estimator recalculates the credit itself; 4102 is already net of it.', keywords: 'medical credit s6a' },
  { code: '4141', label: 'UIF contributions', category: 'tax-paid', mapsTo: null,
    description: 'UIF employee and employer contributions. Not part of income tax — excluded.', keywords: 'unemployment insurance' },
  { code: '4142', label: 'SDL', category: 'tax-paid', mapsTo: null,
    description: 'Skills Development Levy (employer cost). Excluded from the assessment.', keywords: 'skills development levy' },
  { code: '4149', label: 'Total tax, SDL & UIF', category: 'tax-paid', mapsTo: null,
    description: 'The TOTAL of 4102 + 4141 + 4142. Informational — enter 4102 for PAYE instead.', keywords: 'total' },

  // ── Investment income (42xx, IT3(b)/ITR12) ──────────────────────────────────
  { code: '4201', label: 'Local interest', category: 'investment', mapsTo: 'interestIncome',
    description: 'South African interest from banks and investments (IT3(b)). The s10(1)(i) exemption (R23,800 / R34,500 for 65+) is applied automatically.', keywords: 'bank savings it3b exemption' },
  { code: '4218', label: 'Foreign interest', category: 'investment', mapsTo: 'otherIncome',
    description: 'Interest from foreign sources. Fully taxable — NO interest exemption applies, so it is added as other income.', keywords: 'offshore it3b' },
  { code: '4216', label: 'Foreign dividends', category: 'investment', mapsTo: null,
    description: 'Foreign dividends are taxed via a partial-inclusion formula (max effective 20%) with possible foreign credits — not modelled in this estimate. Consult a practitioner.', keywords: 'offshore shares' },
];

/** Lookup a code exactly. */
export const SARS_CODE_BY_CODE: Record<string, SarsCode> = Object.fromEntries(
  SARS_CODES.map((c) => [c.code, c]),
);

/** Case-insensitive search over code, label, description and keywords. */
export function searchSarsCodes(query: string, limit = 12): SarsCode[] {
  const q = query.trim().toLowerCase();
  if (!q) return SARS_CODES.slice(0, limit);
  const scored = SARS_CODES
    .map((c) => {
      const hay = `${c.code} ${c.label} ${c.keywords ?? ''} ${c.description}`.toLowerCase();
      let score = 0;
      if (c.code === q) score = 100;
      else if (c.code.startsWith(q)) score = 80;
      else if (c.label.toLowerCase().includes(q)) score = 60;
      else if ((c.keywords ?? '').toLowerCase().includes(q)) score = 40;
      else if (hay.includes(q)) score = 20;
      return { c, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.c.code.localeCompare(b.c.code));
  return scored.slice(0, limit).map((s) => s.c);
}

// ── IRP5 code rows → assessment inputs ────────────────────────────────────────

export interface CodeRow {
  code: string;
  amount: number;
}

/**
 * Sum entered code rows into the TaxAssessmentInputs fields they map to.
 * Unknown or informational (mapsTo: null) codes are ignored here — the UI
 * surfaces them with their descriptions instead.
 */
export function sumCodeRows(rows: CodeRow[]): Partial<Pick<TaxAssessmentInputs, AssessmentCodeField>> {
  const out: Partial<Record<AssessmentCodeField, number>> = {};
  for (const row of rows) {
    const meta = SARS_CODE_BY_CODE[row.code];
    if (!meta?.mapsTo || !(row.amount > 0)) continue;
    out[meta.mapsTo] = (out[meta.mapsTo] ?? 0) + row.amount;
  }
  return out;
}
