import {
  Home, Building2, MapPin, Car, TrendingUp, Receipt, Wallet, Landmark,
  Shield, Scale, PieChart, House, Briefcase, Snowflake, GraduationCap,
  TrendingDown, History, Activity, BedDouble, DoorOpen, Coins,
  Target, Globe, Scissors, Sunset, BookOpen, LayoutDashboard,
} from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  shortLabel: string;
  icon: typeof Home;
  color: string;
  /** Extra search terms for the command palette / dashboard search. */
  keywords?: string;
}

export interface NavCategory {
  id: string;
  label: string;
  /** Banknote colour shared by every calculator in the group */
  color: string;
  items: NavItem[];
}

type NavCategoryDef = Omit<NavCategory, 'items'> & { items: Omit<NavItem, 'color'>[] };

/**
 * Single source of truth for app navigation — consumed by the sidebar,
 * mobile tab bar, command palette (Ctrl+K), and the Home dashboard.
 * Groups follow the SA banknotes; every calculator takes its group's colour.
 */
const CATEGORY_DEFS: NavCategoryDef[] = [
  {
    id: 'overview',
    label: 'Overview',
    color: 'var(--ink-subtle)',
    items: [
      { path: '/', label: 'Dashboard', shortLabel: 'Home', icon: Home, keywords: 'home start landing' },
    ],
  },
  {
    id: 'property',
    label: 'Property & Loans',
    color: 'var(--note-blue)', // R100 blue
    items: [
      { path: '/mortgage', label: 'Mortgage Calculator', shortLabel: 'Mortgage', icon: Building2, keywords: 'bond home loan repayment amortization' },
      { path: '/property-roi', label: 'Property ROI', shortLabel: 'Property', icon: MapPin, keywords: 'buy to let rental yield cash flow investment' },
      { path: '/affordability', label: 'Bond Affordability', shortLabel: 'Afford', icon: Wallet, keywords: 'qualify how much can i borrow income dti' },
      { path: '/buy-vs-rent', label: 'Buy vs Rent', shortLabel: 'Buy/Rent', icon: House, keywords: 'renting owning compare' },
      { path: '/rental-yield', label: 'Rental Yield Finder', shortLabel: 'Yield', icon: House, keywords: 'gross net yield breakeven rent' },
      { path: '/airbnb-vs-rental', label: 'Airbnb vs Rental', shortLabel: 'Airbnb', icon: BedDouble, keywords: 'short term let occupancy nightly' },
      { path: '/loan-comparison', label: 'Loan Comparison', shortLabel: 'Loans', icon: Scale, keywords: 'compare offers apr fees' },
      { path: '/bond-extra', label: 'Bond Extra Payment', shortLabel: 'Bond Extra', icon: Building2, keywords: 'extra payment interest saved years saved home loan' },
      { path: '/municipal-rates', label: 'Municipal Rates Calculator', shortLabel: 'Rates', icon: Landmark, keywords: 'property rates joburg cape town tshwane ekurhuleni durban refuse sewerage water' },
      { path: '/property-tax', label: 'Property Portfolio Tax', shortLabel: 'Portfolio Tax', icon: Building2, keywords: 'section 13sex five units rental portfolio combined tax depreciation allowance' },
    ],
  },
  {
    id: 'income',
    label: 'Income & Budget',
    color: 'var(--note-green)', // R10 green
    items: [
      { path: '/salary', label: 'Salary Calculator', shortLabel: 'Salary', icon: Briefcase, keywords: 'paye uif take home net pay tax' },
      { path: '/budget', label: 'Budget Planner', shortLabel: 'Budget', icon: Wallet, keywords: '50 30 20 spending savings' },
      { path: '/debt-snowball', label: 'Debt Snowball', shortLabel: 'Debt', icon: Snowflake, keywords: 'avalanche payoff credit card loans' },
      { path: '/emergency-fund', label: 'Emergency Fund', shortLabel: 'Emergency', icon: Shield, keywords: 'safety net savings months' },
      { path: '/provisional-tax', label: 'Provisional Tax', shortLabel: 'Prov. Tax', icon: Receipt, keywords: 'freelance side income iet sars august february' },
      { path: '/retrenchment', label: 'Retrenchment Calculator', shortLabel: 'Retrenchment', icon: Briefcase, keywords: 'severance pay bcea lump sum runway' },
      { path: '/vat', label: 'VAT Calculator', shortLabel: 'VAT', icon: Scissors, keywords: '15% add extract registration threshold sme' },
    ],
  },
  {
    id: 'vehicles',
    label: 'Vehicles',
    color: 'var(--note-red)', // R50 red
    items: [
      { path: '/car-finance', label: 'Car Finance', shortLabel: 'Car', icon: Car, keywords: 'vehicle balloon depreciation instalment' },
      { path: '/car-extra-vs-investing', label: 'Car: Extra vs Investing', shortLabel: 'Car vs Invest', icon: TrendingUp, keywords: 'extra payment invest opportunity' },
    ],
  },
  {
    id: 'investing',
    label: 'Investing & Tax',
    color: 'var(--note-orange)', // R200 orange
    items: [
      { path: '/extra-vs-investing', label: 'Extra vs Investing', shortLabel: 'Invest', icon: TrendingUp, keywords: 'bond etf prepay compare' },
      { path: '/wealth-target', label: 'Wealth Target Planner', shortLabel: 'Wealth Goal', icon: Target, keywords: 'savings goal target monthly lump sum etf tfsa' },
      { path: '/offshore-allowance', label: 'Offshore Allowance Planner', shortLabel: 'Offshore', icon: Globe, keywords: 'forex usd zar depreciation single discretionary allowance sda' },
      { path: '/investment-strategy', label: 'Investment Strategy', shortLabel: 'Strategy', icon: Wallet, keywords: 'ra tfsa etf 2-pot allocation' },
      { path: '/tax-assessment', label: 'SARS Assessment Estimator', shortLabel: 'Assessment', icon: Receipt, keywords: 'refund owing itr12 return efiling annual income tax taxtim' },
      { path: '/sars-codes', label: 'SARS Code Lookup', shortLabel: 'SARS Codes', icon: BookOpen, keywords: 'irp5 it3 source codes 3601 3701 4102 4005 lookup search certificate' },
      { path: '/tax-planner', label: 'Tax Planner', shortLabel: 'Tax', icon: Receipt, keywords: 'rental cgt section 13sex 13quat sars' },
      { path: '/tax-projections', label: 'Tax Projections', shortLabel: 'Tax Proj.', icon: TrendingUp, keywords: 'multi year forecast rental cgt' },
      { path: '/dividend-calculator', label: 'Dividend Income', shortLabel: 'Dividends', icon: Coins, keywords: 'drip yield on cost dividends tax 20%' },
      { path: '/exit-planner', label: 'Optimal Exit Planner', shortLabel: 'Exit', icon: DoorOpen, keywords: 'when to sell recoupment cgt' },
      { path: '/tfsa', label: 'TFSA Optimizer', shortLabel: 'TFSA', icon: Landmark, keywords: 'tax free savings account compounding' },
      { path: '/ra-planner', label: 'RA Planner', shortLabel: 'RA', icon: Shield, keywords: 'retirement annuity deduction 27.5%' },
      { path: '/fire', label: 'FIRE Calculator', shortLabel: 'FIRE', icon: TrendingUp, keywords: 'financial independence retire early' },
      { path: '/retirement-income-goal', label: 'Retirement Income Goal', shortLabel: 'Income Goal', icon: Sunset, keywords: 'desired income after retirement nest egg safe withdrawal rate monthly contribution' },
    ],
  },
  {
    id: 'planning',
    label: 'Planning',
    color: 'var(--note-brown)', // R20 brown
    items: [
      { path: '/net-worth', label: 'Net Worth Dashboard', shortLabel: 'Net Worth', icon: PieChart, keywords: 'assets liabilities track' },
      { path: '/portfolio', label: 'Portfolio Summary', shortLabel: 'Portfolio', icon: Building2, keywords: 'aggregate properties equity' },
      { path: '/stress-test', label: 'Portfolio Stress Test', shortLabel: 'Stress Test', icon: Activity, keywords: 'rate hike vacancy breaking point risk' },
      { path: '/inflation', label: 'Inflation Calculator', shortLabel: 'Inflation', icon: TrendingDown, keywords: 'purchasing power cpi real return' },
      { path: '/education-savings', label: 'Education Savings', shortLabel: 'Education', icon: GraduationCap, keywords: 'school university fees' },
    ],
  },
  {
    id: 'my-portfolio',
    label: 'My Portfolio',
    color: 'var(--note-blue)',
    items: [
      { path: '/portfolio-hub', label: 'Portfolio Manager', shortLabel: 'My Portfolio', icon: LayoutDashboard, keywords: 'expenses maintenance rent records tracker logbook landlord signed in' },
    ],
  },
  {
    id: 'history',
    label: 'History',
    color: 'var(--ink-subtle)',
    items: [
      { path: '/history', label: 'Calculation History', shortLabel: 'History', icon: History, keywords: 'saved snapshots compare' },
    ],
  },
  {
    id: 'learn',
    label: 'Learn',
    color: 'var(--note-teal)',
    items: [
      { path: '/learn', label: 'Financial Education', shortLabel: 'Learn', icon: BookOpen, keywords: 'articles guides education compound interest etf tfsa paye cgt fire property debt snowball' },
    ],
  },
];

export const NAV_CATEGORIES: NavCategory[] = CATEGORY_DEFS.map((c) => ({
  ...c,
  items: c.items.map((i) => ({ ...i, color: c.color })),
}));

/** Flat list of every nav item, in display order. */
export const NAV_ITEMS: NavItem[] = NAV_CATEGORIES.flatMap((c) => c.items);

/** Lookup a nav item by its route path. */
export const NAV_BY_PATH: Record<string, NavItem> = Object.fromEntries(
  NAV_ITEMS.map((i) => [i.path, i]),
);

/** Page titles keyed by path, derived from the nav config. */
export const PAGE_TITLES: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((i) => [i.path, i.label]),
);
