import type { LucideIcon } from 'lucide-react';
import { House } from 'lucide-react';
import type { NavigateFunction } from 'react-router-dom';
import { encodeState } from '../utils/share';

export interface PresetTarget {
  path:  string;
  label: string;
  /** 'router' = navigate(path, { state: { loadedInputs } }); 'query' = navigate(`${path}?s=...`) */
  mode:  'router' | 'query';
  inputs: Record<string, unknown>;
}

export interface Preset {
  id:          string;
  title:       string;
  description: string;
  icon:        LucideIcon;
  color:       string;
  targets:     PresetTarget[];
}

export const PRESETS: Preset[] = [
  {
    id: 'first-time-buyer',
    title: 'First-time Buyer',
    description: 'See your bond repayment, what you qualify for, and the municipal bill on a R1.5m starter home.',
    icon: House,
    color: '#6366F1',
    targets: [
      {
        path: '/mortgage', label: 'Mortgage', mode: 'router',
        inputs: {
          purchasePrice: 1_500_000, deposit: 150_000, interestRate: 11.0, termYears: 20,
          frequency: 'monthly', extraPayment: 0, lumpSumYear: 0, lumpSumAmount: 0,
          monthlyServiceFee: 69, initiationFee: 6037, utilityConnectionFee: 1500,
          transferDutyExempt: false, bondRegistrationIncluded: false,
        },
      },
      {
        path: '/affordability', label: 'Affordability', mode: 'router',
        inputs: {
          grossMonthlyIncome: 45_000, existingMonthlyDebt: 3_000, depositAvailable: 150_000,
          interestRate: 11.0, termYears: 20, instalmentRatio: 30, dtiRatio: 36,
          stressDelta: 2, desiredPropertyPrice: 1_500_000,
        },
      },
      {
        path: '/municipal-rates', label: 'Municipal Rates', mode: 'query',
        inputs: {
          propValue: 1_500_000, cityId: 'coj', rebateType: 'standard', waterKl: 15, escalation: 8,
        },
      },
    ],
  },
];

export function openPresetTarget(navigate: NavigateFunction, target: PresetTarget): void {
  if (target.mode === 'query') {
    navigate(`${target.path}?s=${encodeState(target.inputs)}`);
  } else {
    navigate(target.path, { state: { loadedInputs: target.inputs } });
  }
}
