# FinCalc ZA

> **Smart Investment Tools for South African Investors**
> A production-grade, dark-themed financial calculator suite built with React + TypeScript + Vite. Calibrated for South African conditions — ZAR, live SA Prime Rate, SARS 2026 tax brackets, JSE ETFs, CGT, transfer duty, TFSA, and more.

**Live:** [financial-calculator-za.vercel.app](https://financial-calculator-za.vercel.app)
**Repo:** [github.com/Sash3n/investment_calculator](https://github.com/Sash3n/investment_calculator)

---

## Features

### Mortgage Calculator
- Annuity-formula bond repayment (monthly & bi-weekly)
- Extra monthly payments + once-off lump-sum injection
- Full amortization schedule (collapsible, paginated)
- Interest saved & months saved vs. standard schedule
- Transfer duty (SARS 2026) + bond registration costs panel
- Upfront Cash Required summary (deposit + transfer duty + bond reg)
- Monthly bank service fee with true total-cost banner
- Live SA Prime Rate via SARB API (Vercel serverless proxy)
- PDF export (jsPDF, dark theme, amortization table)
- Save & load snapshots (Google sign-in required)

### Property ROI Calculator
- Dual rental scenario comparison (conservative vs. optimistic)
- Vacancy rate, management fee, full operating cost breakdown
- Transfer duty + bond registration costs in acquisition panel
- Gross yield, net yield, 5-year & 10-year ROI
- Property value + equity growth chart (10 years)
- Income vs. Expenses bar chart + cost composition pie chart
- **Portfolio Manager**: save multiple properties to Firestore
- Edit saved portfolio properties — one-click reload into calculator
- PDF export (jsPDF, dark theme, 10-year projection table)

### Car Finance Calculator
- Balloon payment support (common SA practice)
- Bank-quoted minimum instalment override with warning banner
- Monthly service fee (e.g. Wesbank R69/month)
- Extra monthly payment with interest-saved & months-saved summary
- Depreciation schedule (Year 1: 15%, Year 2: 12%, Year 3+: 10%)
- Underwater months detection (loan balance > vehicle value)
- Opportunity cost comparison: cash purchase vs. financed
- Full amortization table — Standard & With Extras tabs, paginated
- PDF export
- Save & load snapshots (Google sign-in required)

### Extra Payments vs. JSE ETF Investing
- Side-by-side: paying extra into your bond vs. investing the same amount
- JSE ETF benchmarks: Satrix 40 (13%), S&P 500 ETF (18%), Sygnia Itrix (15%), Ashburton (14%)
- South African CGT applied on ETF returns
- Inflation-adjusted comparison
- Year-by-year table + clear winner callout with rand advantage
- Save & load snapshots (Google sign-in required)

### Property Tax Planner
- **Rental Income Tax** — SARS 2026 brackets, all allowable deductions (bond interest, rates, levies, insurance, repairs, management fee), marginal rate on rental income
- **Section 13sex** — new residential unit depreciation allowance (5% / 10% for 20 / 10 years), now fully **multi-unit**:
  - Each unit has its own price, rent, bond, levies, rates, insurance, management fee and vacancy (no longer assumes 5 identical units)
  - **Import from Portfolio** — pull saved Property ROI properties straight in as units (price auto-adjusted for land exclusion)
  - **RA stacking** — model a retirement-annuity contribution alongside the S13 allowance and see the combined tax saving
  - Per-unit analysis table (yield, cash flow), portfolio cash-flow chart, year-by-year schedule, and an in-page education section
- **Section 13quat (UDZ)** — Urban Development Zone allowances (new/improvements/low-cost), full deduction schedule
- **CGT Planner** — primary residence exclusion (R3M, 2026), annual exclusion (R50k), 40% inclusion rate, net proceeds after CGT, joint ownership support

### Investment Strategy Calculator
- Gross-to-net salary breakdown with PAYE, UIF, SDL
- RA vs. TFSA vs. direct ETF contribution optimisation
- Monthly tax saving from RA contributions
- 2-Pot retirement system modelling
- Recommended strategy tag based on income and goals
- Exact ZAR figures displayed (no abbreviated K/M values)

### Tax Projections (Multi-Year)
- Year-by-year rental tax forecast over 5–20 year hold period
- Rent escalation modelling (configurable % p.a.)
- Declining bond interest deductions as loan amortises
- Annual net rental profit vs. tax paid (bar chart)
- Cumulative net cash vs. cumulative tax (area chart)
- CGT at each potential exit year — full table with optimal exit ★
- Total Return = net sale proceeds + cumulative rental net − purchase price

### TFSA Optimizer
- Lifetime allowance tracker (R500k) with animated progress bar
- Annual contribution cap enforcement (R46,000/year, SARS 2026/27)
- TFSA vs. taxable investment comparison (same balance, same contributions)
- Tax drag modelling by investment type:
  - ETF: 20% dividend withholding tax on yield, CGT on disposal
  - Balanced fund: higher income yield assumption
  - Cash/money market: income tax on interest after exemption (R23,800/R34,500)
- TFSA vs. taxable area chart (compounding divergence over time)
- Annual tax avoided bar chart
- Year-by-year table with lifetime-maxed marker (★)
- Key SARS rules callout (limits, withdrawal rules, zero-tax guarantee)

### Portfolio Summary
- Aggregate view across all saved Property ROI properties
- Total portfolio value, equity, outstanding debt, monthly cash flow, blended yield
- Monthly cash flow bar chart (green/red per property)
- Gross vs. net yield comparison bar chart
- Equity growth area chart (per-property series)
- Per-property breakdown table with totals row
- One-click "Open" to load any property back into the ROI calculator

### Portfolio Stress Test
- Reads your saved Property ROI portfolio — **no extra data entry**
- Runs every property through adverse scenarios: prime +1/+2/+3%, 15% vacancy, −10% value, and a combined worst case
- Monthly cash-flow matrix (property × scenario) with negatives flagged
- **Breaking-point rate** per property — the interest rate at which it turns cash-flow negative — plus rate headroom
- Most-fragile property callout, portfolio totals, and a how-to-read-it education section

### Bond Affordability Qualifier
- Max home loan & property price using SA bank rules: 30% instalment-to-income + NCA ~36% debt-to-income
- Live prime rate seeded as the default interest rate
- **Rate stress test** — how much your qualifying loan shrinks if rates rise
- Upfront cash needed (deposit + transfer duty + bond registration)
- "Can I afford this specific home?" target-price check with required-income estimate
- Income-allocation pie + affordability-vs-stress bar chart, education section

### Airbnb vs Long-term Rental
- Compares short-term letting vs a traditional lease on the same property
- Net operating income (before bond, like-for-like), net yield, and after-bond monthly cash flow for each
- **Break-even occupancy** — the Airbnb occupancy needed to match the long-term lease
- Models platform fees, cleaning per stay, co-host/management %, utilities, and vacancy
- Winner banner, side-by-side comparison table, income-breakdown chart, education section

### Optimal Exit Planner
- Answers "when should I sell?" across years 1 / 3 / 5 / 10 / 15 / 20 / 25
- Combines **CGT**, **Section 13sex recoupment** (allowances clawed back as income on sale), and your marginal rate
- Surfaces the recoupment trap and the **net lifetime tax position** (S13 savings received − tax paid on exit)
- Best-cash-year and best-tax-year callouts, net-proceeds vs exit-tax chart, scenario table, education section

### Comparison Mode
- Select any two saved snapshots of the same calculator type
- Side-by-side A/B table with diff column
- Green = better, red = worse, per metric (lower-better / higher-better / neutral)
- Diff badge shows amount and direction arrow
- Supports: Mortgage, Property ROI, Car Finance comparisons

### Calculation History
- All saved snapshots from every calculator in one place
- Open any snapshot — navigates to the correct calculator in edit mode
- Delete individual entries or clear all history
- Compare mode: select two entries → navigate to `/compare`

### Save / Load Snapshots (all calculators)
- **Google sign-in** — one-click Google Auth via Firebase
- **Save snapshot** — captures current inputs + key result as a named entry
- **Edit mode** — load saved snapshot back, overwrite same Firestore document
- **Rename** — inline title editing without touching inputs
- **New** button — exit edit mode to save a fresh snapshot
- Synced to Firestore, accessible across devices

### App-wide
- **Route-based code splitting** — calculator pages are lazy-loaded as on-demand chunks (initial bundle trimmed from ~2.3 MB to ~620 KB); heavy libs (jsPDF, xlsx, html2canvas, Recharts) load only when their page is opened
- Live SA Prime Rate — fetched from SARB API via Vercel serverless proxy, cached 6hrs in sessionStorage, shown in sidebar footer
- Dark/light mode toggle — persisted to `localStorage`
- Responsive: desktop sidebar + scrollable mobile bottom tab bar
- Glassmorphism dark theme (#0A0F1E, indigo/amber palette, Outfit + DM Sans)
- Framer Motion page transitions and card animations
- South African Rand (ZAR) formatting throughout
- 404 and Error pages (status-aware, fintech-styled)
- Educational disclaimer banner

---

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| Build | Vite | 8.x |
| UI Framework | React | 19.x |
| Language | TypeScript | 5.x (strict) |
| Styling | Tailwind CSS v4 | 4.x |
| Component Library | DaisyUI | 5.x |
| Routing | React Router | 7.x |
| Charts | Recharts | 3.x |
| Animations | Framer Motion | 12.x |
| Icons | Lucide React | latest |
| PDF Export | jsPDF | latest |
| Excel Export | SheetJS (xlsx) | latest |
| Auth | Firebase Auth (Google) | 11.x |
| Database | Firebase Firestore | 11.x |
| Hosting | Vercel (+ serverless functions) | — |

---

## Project Structure

```
src/
├── components/
│   ├── Layout/
│   │   └── AppShell.tsx          # Sidebar, header, mobile nav, theme toggle, auth
│   └── ui/
│       ├── InputField.tsx
│       ├── SelectField.tsx
│       ├── StatCard.tsx
│       ├── SectionHeader.tsx
│       └── SaveLoadBar.tsx       # Reusable save/load/edit panel
├── context/
│   └── AuthContext.tsx           # Firebase Auth provider
├── hooks/
│   ├── useFirestore.ts           # useSavedProperties + useHistory hooks
│   └── usePrimeRate.ts           # Live SARB prime rate fetch + sessionStorage cache
├── lib/
│   └── firebase.ts               # Firebase initialisation
├── pages/
│   ├── Dashboard.tsx
│   ├── MortgageCalculator.tsx
│   ├── PropertyROI.tsx
│   ├── CarFinance.tsx
│   ├── PaymentVsInvesting.tsx
│   ├── TaxPlanner.tsx            # Rental tax, Section 13sex/quat, CGT
│   ├── InvestmentStrategy.tsx
│   ├── TaxProjections.tsx        # Multi-year rental tax forecast
│   ├── TfsaOptimizer.tsx         # TFSA vs taxable comparison
│   ├── PortfolioSummary.tsx      # Aggregate property portfolio view
│   ├── StressTest.tsx            # Portfolio stress test (rate/vacancy/value)
│   ├── Affordability.tsx         # Bond affordability qualifier
│   ├── AirbnbVsRental.tsx        # Short-term vs long-term rental
│   ├── ExitPlanner.tsx           # Optimal exit (CGT + S13 recoupment)
│   ├── History.tsx               # Unified history + compare mode
│   ├── Compare.tsx               # A/B snapshot comparison
│   ├── NotFound.tsx              # 404 page
│   └── ErrorPage.tsx             # Error boundary page
├── utils/
│   ├── mortgage.ts
│   ├── roi.ts
│   ├── car.ts
│   ├── investing.ts
│   ├── tax.ts                    # SARS brackets, transfer duty, CGT, Section 13
│   ├── stress.ts                 # Portfolio stress-test scenarios
│   ├── affordability.ts          # Bond affordability (30% rule + NCA DTI)
│   ├── shortTermRental.ts        # Airbnb vs long-term rental comparison
│   ├── exitPlanner.ts            # CGT + S13 recoupment by sale year
│   ├── pdf.ts                    # jsPDF exporters (Mortgage, Property, Car)
│   └── format.ts
├── types/
│   └── index.ts
├── App.tsx
├── main.tsx
└── index.css
api/
└── prime-rate.ts                 # Vercel serverless proxy for SARB rate
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- A Firebase project (Auth + Firestore)
- A Vercel account (for serverless prime rate proxy)

### Installation

```bash
git clone https://github.com/Sash3n/investment_calculator.git
cd investment_calculator
npm install
```

### Firebase Setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Google sign-in** under Authentication → Sign-in methods
3. Create a **Firestore database** (production mode)
4. Set Firestore rules:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
5. Register a web app and copy config into `.env.local`:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
   > **Note:** `VITE_FIREBASE_AUTH_DOMAIN` must be the `.firebaseapp.com` domain, not your Vercel domain — otherwise Google OAuth redirect will fail.

### Run

```bash
npm run dev       # dev server at http://localhost:5173
npm run build     # production build (runs tsc + vite)
npm run preview   # preview production build locally
```

---

## South Africa–Specific Defaults

| Parameter | Default | Notes |
|---|---|---|
| Prime Rate | Live (SARB API) | Falls back to 10.25% if unavailable |
| Repo Rate | Live (SARB API) | Falls back to 6.75% |
| CGT inclusion rate | 40% | SARS 2026 |
| CGT annual exclusion | R50,000 | Increased from R40k in 2026 budget |
| Primary residence exclusion | R3,000,000 | Increased from R2M in 2026 budget |
| TFSA annual limit | R46,000 | Per tax year (increased from R36k in 2026/27 budget) |
| TFSA lifetime limit | R500,000 | Total contributions |
| Bond term | 20 years | SA standard |
| Bank service fee | R69/month | Typical bond admin fee |
| Vacancy rate | 8% | ~1 month/year industry estimate |
| Management fee | 10% | Letting agent standard |
| Annual appreciation | 5% | Long-run SA property average |

---

## Roadmap

- [x] Google Auth + Cloud Sync (Firestore)
- [x] Calculation History with edit/delete
- [x] Investment Strategy Calculator (RA, TFSA, ETF, 2-Pot)
- [x] Property Tax Planner (rental tax, Section 13sex/quat, CGT)
- [x] Transfer duty (SARS 2026) + bond registration costs
- [x] Live SA Prime Rate (SARB API via Vercel serverless proxy)
- [x] PDF export — Mortgage, Property ROI, Car Finance
- [x] Comparison Mode (A/B snapshot comparison)
- [x] Portfolio Summary (aggregate property dashboard)
- [x] Tax Projections (multi-year rental + CGT forecast)
- [x] TFSA Optimizer (tax-free vs taxable compounding)
- [x] Section 13sex multi-unit overhaul (per-unit pricing, portfolio import, RA stacking)
- [x] Portfolio Stress Test (rate/vacancy/value scenarios + breaking-point rates)
- [x] Bond Affordability Qualifier (30% rule, NCA DTI, rate stress test)
- [x] Airbnb vs Long-term Rental comparison (NOI, yield, break-even occupancy)
- [x] Optimal Exit Planner (CGT + S13sex recoupment by sale year)
- [x] Route-based lazy loading / code splitting
- [ ] FIRE Calculator — time to financial independence
- [ ] Retirement Annuity Planner (27.5% deduction, 2-Pot rules)
- [ ] Buy vs. Rent Calculator
- [ ] Shareable report links (URL-encoded snapshots)

---

## License

MIT — free to use, modify, and distribute.

---

*Built for South African investors. All calculations are for educational purposes only and do not constitute financial advice. Consult a certified financial planner (CFP) or SARS-registered tax practitioner before making financial decisions.*
