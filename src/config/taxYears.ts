/**
 * FinCalc ZA — SARS tax-year constants
 *
 * Single source of truth for all year-specific SARS figures, keyed by tax year.
 * A South African "tax year" is named after the year in which it ends, e.g. the
 * 2027 tax year runs 1 March 2026 to 28 February 2027.
 *
 * Verified July 2026 against:
 *  - SARS Rates of Tax for Individuals (sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals)
 *  - SARS Capital Gains Tax rates (sars.gov.za/tax-rates/income-tax/capital-gains-tax-cgt)
 *  - SARS Transfer Duty rates (sars.gov.za/tax-rates/transfer-duty)
 *  - National Treasury Budget 2026 Tax Guide (treasury.gov.za)
 *
 * Key history encoded here:
 *  - 2024–2026 tax years: income-tax brackets, rebates, medical credits and the
 *    interest exemption were FROZEN (no inflation adjustment for three years).
 *  - 2027 tax year (Budget 2026): brackets/rebates/thresholds adjusted +3.4%,
 *    medical credits raised to R376/R376/R254, retirement deduction cap raised
 *    R350,000 → R430,000, CGT annual exclusion R40,000 → R50,000 and primary
 *    residence exclusion R2,000,000 → R3,000,000. CGT inclusion rate unchanged.
 *  - Transfer duty: table uplifted 10% effective 1 APRIL 2025 (threshold
 *    R1,100,000 → R1,210,000); unchanged at 1 April 2026. Transfer duty changes
 *    on 1 April rather than 1 March, so each tax year is mapped to the table in
 *    force for 11 of its 12 months.
 */

import type { AgeGroup, UDZBuildingType } from '../types';

export type TaxYearId = '2024' | '2025' | '2026' | '2027';

/** Default tax year: the current SARS tax year (1 Mar 2026 – 28 Feb 2027). */
export const DEFAULT_TAX_YEAR: TaxYearId = '2027';

/** Ordered for display in selectors (newest first). */
export const TAX_YEAR_OPTIONS: { id: TaxYearId; label: string; period: string }[] = [
  { id: '2027', label: '2026/2027', period: '1 Mar 2026 – 28 Feb 2027' },
  { id: '2026', label: '2025/2026', period: '1 Mar 2025 – 28 Feb 2026' },
  { id: '2025', label: '2024/2025', period: '1 Mar 2024 – 28 Feb 2025' },
  { id: '2024', label: '2023/2024', period: '1 Mar 2023 – 29 Feb 2024' },
];

export interface TaxBracket { min: number; max: number; base: number; rate: number }

export interface TaxYearConstants {
  /** SARS income tax brackets (annual taxable income). */
  brackets: TaxBracket[];
  /** Section 6 rebates by age group (already cumulative: 65to74 = primary+secondary, etc). */
  rebates: Record<AgeGroup, number>;
  /** Income below which no tax is payable, by age group (= rebate / 18%). */
  taxThreshold: Record<AgeGroup, number>;
  /** Section 6A medical scheme fees tax credit, per month. */
  medCredits: { main: number; firstDep: number; extraDep: number };
  /** UIF employee contribution. */
  uif: { rate: number; capMonthly: number };
  /** Section 10(1)(i) local interest exemption, per year. */
  interestExemption: { under65: number; age65plus: number };
  /** Capital Gains Tax (Eighth Schedule) constants for individuals. */
  cgt: { primaryResidenceExclusion: number; annualExclusion: number; inclusionRate: number };
  /** Transfer duty brackets (property acquisition). */
  transferDutyBrackets: TaxBracket[];
  /** Section 13quat (UDZ) accelerated allowance schedules by building type. */
  udzSchedules: Record<UDZBuildingType, { rate: number; years: number }[]>;
  /** Retirement fund contribution deduction: min(rate * income, cap p.a.). */
  retirement: { rate: number; cap: number };
}

// ── Income-tax tables frozen across the 2024–2026 tax years ──────────────────
const BRACKETS_2024_2026: TaxBracket[] = [
  { min: 0,          max: 237_100,    base: 0,         rate: 0.18 },
  { min: 237_101,    max: 370_500,    base: 42_678,    rate: 0.26 },
  { min: 370_501,    max: 512_800,    base: 77_362,    rate: 0.31 },
  { min: 512_801,    max: 673_000,    base: 121_475,   rate: 0.36 },
  { min: 673_001,    max: 857_900,    base: 179_147,   rate: 0.39 },
  { min: 857_901,    max: 1_817_000,  base: 251_258,   rate: 0.41 },
  { min: 1_817_001,  max: Infinity,   base: 644_489,   rate: 0.45 },
];

// 2027 tax year (Budget 2026): +3.4% inflation adjustment.
const BRACKETS_2027: TaxBracket[] = [
  { min: 0,          max: 245_100,    base: 0,         rate: 0.18 },
  { min: 245_101,    max: 383_100,    base: 44_118,    rate: 0.26 },
  { min: 383_101,    max: 530_200,    base: 79_998,    rate: 0.31 },
  { min: 530_201,    max: 695_800,    base: 125_599,   rate: 0.36 },
  { min: 695_801,    max: 887_000,    base: 185_215,   rate: 0.39 },
  { min: 887_001,    max: 1_878_600,  base: 259_783,   rate: 0.41 },
  { min: 1_878_601,  max: Infinity,   base: 666_339,   rate: 0.45 },
];

const REBATES_2024_2026: Record<AgeGroup, number> = {
  under65: 17_235,
  '65to74': 17_235 + 9_444,             // primary + secondary
  '75plus': 17_235 + 9_444 + 3_145,     // primary + secondary + tertiary
};

const REBATES_2027: Record<AgeGroup, number> = {
  under65: 17_820,
  '65to74': 17_820 + 9_765,
  '75plus': 17_820 + 9_765 + 3_249,
};

// SARS-published thresholds (= rebate / 18%).
const THRESHOLDS_2024_2026: Record<AgeGroup, number> = {
  under65: 95_750,
  '65to74': 148_217,
  '75plus': 165_689,
};

const THRESHOLDS_2027: Record<AgeGroup, number> = {
  under65: 99_000,
  '65to74': 153_250,
  '75plus': 171_300,
};

const MED_CREDITS_2024_2026 = { main: 364, firstDep: 364, extraDep: 246 };
const MED_CREDITS_2027      = { main: 376, firstDep: 376, extraDep: 254 };

// UIF: 1% of remuneration, capped at R17,712/month → max R177.12/mo (unchanged).
const UIF = { rate: 0.01, capMonthly: 177.12 };

// Section 10(1)(i) interest exemption — unchanged for many years.
const INTEREST_EXEMPTION = { under65: 23_800, age65plus: 34_500 };

// Retirement fund deduction: 27.5% of the greater of remuneration or taxable
// income. Cap raised R350,000 → R430,000 in Budget 2026 (2027 tax year).
const RETIREMENT_2024_2026 = { rate: 0.275, cap: 350_000 };
const RETIREMENT_2027      = { rate: 0.275, cap: 430_000 };

// CGT (individuals). Budget 2026 raised both exclusions for the 2027 tax year.
const CGT_2024_2026 = { primaryResidenceExclusion: 2_000_000, annualExclusion: 40_000, inclusionRate: 0.40 };
const CGT_2027      = { primaryResidenceExclusion: 3_000_000, annualExclusion: 50_000, inclusionRate: 0.40 };

// Transfer duty in force 1 Mar 2023 – 31 Mar 2025 (threshold R1,100,000).
const TRANSFER_DUTY_TO_MAR_2025: TaxBracket[] = [
  { min: 0,          max: 1_100_000,  base: 0,         rate: 0.00 },
  { min: 1_100_001,  max: 1_512_500,  base: 0,         rate: 0.03 },
  { min: 1_512_501,  max: 2_117_500,  base: 12_375,    rate: 0.06 },
  { min: 2_117_501,  max: 2_722_500,  base: 48_675,    rate: 0.08 },
  { min: 2_722_501,  max: 12_100_000, base: 97_075,    rate: 0.11 },
  { min: 12_100_001, max: Infinity,   base: 1_128_600, rate: 0.13 },
];

// Transfer duty effective 1 April 2025 (+10% brackets); unchanged 1 April 2026.
const TRANSFER_DUTY_FROM_APR_2025: TaxBracket[] = [
  { min: 0,          max: 1_210_000,  base: 0,         rate: 0.00 },
  { min: 1_210_001,  max: 1_663_800,  base: 0,         rate: 0.03 },
  { min: 1_663_801,  max: 2_329_300,  base: 13_614,    rate: 0.06 },
  { min: 2_329_301,  max: 2_994_800,  base: 53_544,    rate: 0.08 },
  { min: 2_994_801,  max: 13_310_000, base: 106_784,   rate: 0.11 },
  { min: 13_310_001, max: Infinity,   base: 1_241_456, rate: 0.13 },
];

// Section 13quat (Urban Development Zone) schedules — statutory, not year-varying.
const UDZ_SCHEDULES: Record<UDZBuildingType, { rate: number; years: number }[]> = {
  new: [
    { rate: 0.20, years: 1 },
    { rate: 0.08, years: 10 },
  ],
  improvements: [
    { rate: 0.20, years: 5 },
  ],
  lowcost: [
    { rate: 0.25, years: 4 },
  ],
};

const YEAR_2024_2026_SHARED = {
  brackets: BRACKETS_2024_2026,
  rebates: REBATES_2024_2026,
  taxThreshold: THRESHOLDS_2024_2026,
  medCredits: MED_CREDITS_2024_2026,
  uif: UIF,
  interestExemption: INTEREST_EXEMPTION,
  cgt: CGT_2024_2026,
  udzSchedules: UDZ_SCHEDULES,
  retirement: RETIREMENT_2024_2026,
};

export const TAX_YEARS: Record<TaxYearId, TaxYearConstants> = {
  '2024': { ...YEAR_2024_2026_SHARED, transferDutyBrackets: TRANSFER_DUTY_TO_MAR_2025 },
  '2025': { ...YEAR_2024_2026_SHARED, transferDutyBrackets: TRANSFER_DUTY_TO_MAR_2025 },
  // 2026 tax year: frozen income-tax tables; transfer duty switched to the
  // uplifted table on 1 Apr 2025 (in force for 11 of the year's 12 months).
  '2026': { ...YEAR_2024_2026_SHARED, transferDutyBrackets: TRANSFER_DUTY_FROM_APR_2025 },
  '2027': {
    brackets: BRACKETS_2027,
    rebates: REBATES_2027,
    taxThreshold: THRESHOLDS_2027,
    medCredits: MED_CREDITS_2027,
    uif: UIF,
    interestExemption: INTEREST_EXEMPTION,
    cgt: CGT_2027,
    transferDutyBrackets: TRANSFER_DUTY_FROM_APR_2025,
    udzSchedules: UDZ_SCHEDULES,
    retirement: RETIREMENT_2027,
  },
};
