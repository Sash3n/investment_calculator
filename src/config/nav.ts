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
  items: NavItem[];
}

/**
 * Single source of truth for app navigation — consumed by the sidebar,
 * mobile tab bar, command palette (Ctrl+K), and the Home dashboard.
 */
export const NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { path: '/', label: 'Dashboard', shortLabel: 'Home', icon: Home, color: 'var(--note-blue)', keywords: 'home start landing' },
    ],
  },
  {
    id: 'property',
    label: 'Property & Loans',
    items: [
      { path: '/mortgage', label: 'Mortgage Calculator', shortLabel: 'Mortgage', icon: Building2, color: 'var(--note-orange)', keywords: 'bond home loan repayment amortization' },
      { path: '/property-roi', label: 'Property ROI', shortLabel: 'Property', icon: MapPin, color: 'var(--gain)', keywords: 'buy to let rental yield cash flow investment' },
      { path: '/affordability', label: 'Bond Affordability', shortLabel: 'Afford', icon: Wallet, color: 'var(--note-blue)', keywords: 'qualify how much can i borrow income dti' },
      { path: '/buy-vs-rent', label: 'Buy vs Rent', shortLabel: 'Buy/Rent', icon: House, color: 'var(--gain)', keywords: 'renting owning compare' },
      { path: '/rental-yield', label: 'Rental Yield Finder', shortLabel: 'Yield', icon: House, color: 'var(--gain)', keywords: 'gross net yield breakeven rent' },
      { path: '/airbnb-vs-rental', label: 'Airbnb vs Rental', shortLabel: 'Airbnb', icon: BedDouble, color: 'var(--note-red)', keywords: 'short term let occupancy nightly' },
      { path: '/loan-comparison', label: 'Loan Comparison', shortLabel: 'Loans', icon: Scale, color: 'var(--note-orange)', keywords: 'compare offers apr fees' },
      { path: '/bond-extra', label: 'Bond Extra Payment', shortLabel: 'Bond Extra', icon: Building2, color: 'var(--gain)', keywords: 'extra payment interest saved years saved home loan' },
      { path: '/municipal-rates', label: 'Municipal Rates Calculator', shortLabel: 'Rates', icon: Landmark, color: 'var(--gain)', keywords: 'property rates joburg cape town tshwane ekurhuleni durban refuse sewerage water' },
      { path: '/property-tax', label: 'Property Portfolio Tax', shortLabel: 'Portfolio Tax', icon: Building2, color: 'var(--note-brown)', keywords: 'section 13sex five units rental portfolio combined tax depreciation allowance' },
    ],
  },
  {
    id: 'income',
    label: 'Income & Budget',
    items: [
      { path: '/salary', label: 'Salary Calculator', shortLabel: 'Salary', icon: Briefcase, color: 'var(--note-blue)', keywords: 'paye uif take home net pay tax' },
      { path: '/budget', label: 'Budget Planner', shortLabel: 'Budget', icon: Wallet, color: 'var(--gain)', keywords: '50 30 20 spending savings' },
      { path: '/debt-snowball', label: 'Debt Snowball', shortLabel: 'Debt', icon: Snowflake, color: 'var(--note-teal)', keywords: 'avalanche payoff credit card loans' },
      { path: '/emergency-fund', label: 'Emergency Fund', shortLabel: 'Emergency', icon: Shield, color: 'var(--gain)', keywords: 'safety net savings months' },
      { path: '/provisional-tax', label: 'Provisional Tax', shortLabel: 'Prov. Tax', icon: Receipt, color: 'var(--note-orange)', keywords: 'freelance side income iet sars august february' },
      { path: '/retrenchment', label: 'Retrenchment Calculator', shortLabel: 'Retrenchment', icon: Briefcase, color: 'var(--note-brown)', keywords: 'severance pay bcea lump sum runway' },
      { path: '/vat', label: 'VAT Calculator', shortLabel: 'VAT', icon: Scissors, color: 'var(--note-orange)', keywords: '15% add extract registration threshold sme' },
    ],
  },
  {
    id: 'vehicles',
    label: 'Vehicles',
    items: [
      { path: '/car-finance', label: 'Car Finance', shortLabel: 'Car', icon: Car, color: 'var(--note-red)', keywords: 'vehicle balloon depreciation instalment' },
      { path: '/car-extra-vs-investing', label: 'Car: Extra vs Investing', shortLabel: 'Car vs Invest', icon: TrendingUp, color: 'var(--note-red)', keywords: 'extra payment invest opportunity' },
    ],
  },
  {
    id: 'investing',
    label: 'Investing & Tax',
    items: [
      { path: '/extra-vs-investing', label: 'Extra vs Investing', shortLabel: 'Invest', icon: TrendingUp, color: 'var(--note-teal)', keywords: 'bond etf prepay compare' },
      { path: '/wealth-target', label: 'Wealth Target Planner', shortLabel: 'Wealth Goal', icon: Target, color: 'var(--note-blue)', keywords: 'savings goal target monthly lump sum etf tfsa' },
      { path: '/offshore-allowance', label: 'Offshore Allowance Planner', shortLabel: 'Offshore', icon: Globe, color: 'var(--note-teal)', keywords: 'forex usd zar depreciation single discretionary allowance sda' },
      { path: '/investment-strategy', label: 'Investment Strategy', shortLabel: 'Strategy', icon: Wallet, color: 'var(--note-brown)', keywords: 'ra tfsa etf 2-pot allocation' },
      { path: '/tax-assessment', label: 'SARS Assessment Estimator', shortLabel: 'Assessment', icon: Receipt, color: 'var(--note-blue)', keywords: 'refund owing itr12 return efiling annual income tax taxtim' },
      { path: '/sars-codes', label: 'SARS Code Lookup', shortLabel: 'SARS Codes', icon: BookOpen, color: 'var(--note-teal)', keywords: 'irp5 it3 source codes 3601 3701 4102 4005 lookup search certificate' },
      { path: '/tax-planner', label: 'Tax Planner', shortLabel: 'Tax', icon: Receipt, color: 'var(--gain)', keywords: 'rental cgt section 13sex 13quat sars' },
      { path: '/tax-projections', label: 'Tax Projections', shortLabel: 'Tax Proj.', icon: TrendingUp, color: 'var(--note-teal)', keywords: 'multi year forecast rental cgt' },
      { path: '/dividend-calculator', label: 'Dividend Income', shortLabel: 'Dividends', icon: Coins, color: 'var(--gain)', keywords: 'drip yield on cost dividends tax 20%' },
      { path: '/exit-planner', label: 'Optimal Exit Planner', shortLabel: 'Exit', icon: DoorOpen, color: 'var(--note-brown)', keywords: 'when to sell recoupment cgt' },
      { path: '/tfsa', label: 'TFSA Optimizer', shortLabel: 'TFSA', icon: Landmark, color: 'var(--note-brown)', keywords: 'tax free savings account compounding' },
      { path: '/ra-planner', label: 'RA Planner', shortLabel: 'RA', icon: Shield, color: 'var(--note-blue)', keywords: 'retirement annuity deduction 27.5%' },
      { path: '/fire', label: 'FIRE Calculator', shortLabel: 'FIRE', icon: TrendingUp, color: 'var(--loss)', keywords: 'financial independence retire early' },
      { path: '/retirement-income-goal', label: 'Retirement Income Goal', shortLabel: 'Income Goal', icon: Sunset, color: 'var(--note-orange)', keywords: 'desired income after retirement nest egg safe withdrawal rate monthly contribution' },
    ],
  },
  {
    id: 'planning',
    label: 'Planning',
    items: [
      { path: '/net-worth', label: 'Net Worth Dashboard', shortLabel: 'Net Worth', icon: PieChart, color: 'var(--note-blue)', keywords: 'assets liabilities track' },
      { path: '/portfolio', label: 'Portfolio Summary', shortLabel: 'Portfolio', icon: Building2, color: 'var(--gain)', keywords: 'aggregate properties equity' },
      { path: '/stress-test', label: 'Portfolio Stress Test', shortLabel: 'Stress Test', icon: Activity, color: 'var(--loss)', keywords: 'rate hike vacancy breaking point risk' },
      { path: '/inflation', label: 'Inflation Calculator', shortLabel: 'Inflation', icon: TrendingDown, color: 'var(--loss)', keywords: 'purchasing power cpi real return' },
      { path: '/education-savings', label: 'Education Savings', shortLabel: 'Education', icon: GraduationCap, color: 'var(--note-brown)', keywords: 'school university fees' },
    ],
  },
  {
    id: 'my-portfolio',
    label: 'My Portfolio',
    items: [
      { path: '/portfolio-hub', label: 'Portfolio Manager', shortLabel: 'My Portfolio', icon: LayoutDashboard, color: 'var(--note-blue)', keywords: 'expenses maintenance rent records tracker logbook landlord signed in' },
    ],
  },
  {
    id: 'history',
    label: 'History',
    items: [
      { path: '/history', label: 'Calculation History', shortLabel: 'History', icon: History, color: 'var(--note-orange)', keywords: 'saved snapshots compare' },
    ],
  },
  {
    id: 'learn',
    label: 'Learn',
    items: [
      { path: '/learn', label: 'Financial Education', shortLabel: 'Learn', icon: BookOpen, color: 'var(--note-blue)', keywords: 'articles guides education compound interest etf tfsa paye cgt fire property debt snowball' },
    ],
  },
];

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
