# FinCalc ZA

> **Smart Investment Tools for South African Investors**
> A production-grade, dark-themed financial calculator suite built with React + TypeScript + Vite. Covers mortgages, buy-to-let property ROI, car finance, and the classic extra-payment vs. investing dilemma — all calibrated for South African conditions (ZAR, Prime Rate, JSE ETFs, CGT).

---

## Screenshots

| Dashboard (Dark) | Dashboard (Light) |
|---|---|
| ![Dashboard Dark](docs/screenshots/dashboard.png) | ![Dashboard Light](docs/screenshots/dashboard-light.png) |

| Mortgage Calculator | Property ROI |
|---|---|
| ![Mortgage](docs/screenshots/mortgage.png) | ![Property ROI](docs/screenshots/property-roi.png) |

| Car Finance | Extra Payments vs Investing |
|---|---|
| ![Car Finance](docs/screenshots/car-finance.png) | ![Extra vs Investing](docs/screenshots/extra-vs-investing.png) |

| Tax Planner | Investment Strategy |
|---|---|
| ![Tax Planner](docs/screenshots/tax-planner.png) | ![Investment Strategy](docs/screenshots/investment-strategy.png) |

| Light Mode |
|---|
| ![Light Mode](docs/screenshots/light-mode.png) |
---

## Features

### Mortgage Calculator
- Annuity-formula bond repayment (monthly & bi-weekly)
- Extra monthly payments + once-off lump-sum injection
- Full amortization schedule (collapsible, paginated)
- Interest saved & months saved vs. standard schedule
- Monthly bank service fee with true total-cost banner
- Payoff date projection with and without extras
- Excel (XLSX) export of the full schedule

### Property ROI Calculator
- Dual rental scenario comparison (conservative vs. optimistic)
- Vacancy rate adjustment
- Management fee (% of effective rent)
- Full cost breakdown: bond repayment, levies, rates, insurance, effluent fees, misc fees
- Gross yield, net yield, 5-year ROI, 10-year ROI
- Property value + equity growth chart (10 years)
- Income vs. Expenses bar chart
- Cost composition pie chart
- **Portfolio Manager**: save multiple properties to localStorage, compare side-by-side, bulk Excel export

### Car Finance Calculator
- Balloon payment support (common SA practice)
- Bank-quoted minimum instalment override with warning banner
- Monthly service fee (e.g. Wesbank R69/month)
- Extra monthly payment with interest-saved & months-saved summary
- Depreciation schedule (Year 1: 15%, Year 2: 12%, Year 3+: 10%)
- Underwater months detection (loan balance > vehicle value)
- Opportunity cost comparison: cash purchase vs. financed
- Full amortization table — Standard & With Extras tabs, paginated

### Extra Payments vs. JSE ETF Investing
- Side-by-side: paying extra into your bond vs. investing the same amount
- JSE ETF benchmarks: Satrix 40 (13%), S&P 500 ETF (18%), Sygnia Itrix (15%), Ashburton (14%), Coronation (12%)
- South African CGT: 18% effective rate (40% inclusion × 45% marginal)
- Inflation-adjusted comparison
- Year-by-year table showing bond balance (both scenarios) and portfolio value
- Clear winner callout with rand advantage

### App-wide
- Dark/light mode toggle — persisted to `localStorage`
- Responsive layout: desktop sidebar + mobile bottom tab bar
- Glassmorphism dark theme (#0A0F1E, indigo/amber palette)
- Framer Motion page transitions and card animations
- South African Rand (ZAR) formatting throughout
- Prime Rate displayed in sidebar footer (11.25%)

---

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| Build | Vite | 8.x |
| UI Framework | React | 19.x |
| Language | TypeScript | 5.x (strict) |
| Styling | Tailwind CSS v4 | 4.x (CSS-only config) |
| Component Library | DaisyUI | 5.x |
| Routing | React Router | 7.x |
| Charts | Recharts | 2.x |
| Animations | Framer Motion | 11.x |
| Icons | Lucide React | latest |
| Excel Export | SheetJS (xlsx) | latest |
| CSS Utilities | clsx | latest |

---

## Project Structure

```
src/
├── components/
│   ├── Layout/
│   │   └── AppShell.tsx        # Sidebar, header, mobile nav, theme toggle
│   └── ui/
│       ├── InputField.tsx      # Labelled number/text input with prefix/suffix
│       ├── SelectField.tsx     # Styled select dropdown
│       ├── StatCard.tsx        # Metric card with icon and trend
│       └── SectionHeader.tsx   # Section heading with optional icon
├── pages/
│   ├── Dashboard.tsx           # Overview landing page
│   ├── MortgageCalculator.tsx
│   ├── PropertyROI.tsx         # Includes portfolio manager
│   ├── CarFinance.tsx
│   └── ExtraVsInvesting.tsx
├── utils/
│   ├── mortgage.ts             # Bond maths (annuity, amortization, lump sum)
│   ├── roi.ts                  # Property ROI, yields, equity projections
│   ├── car.ts                  # Car finance, balloon, depreciation, underwater
│   ├── investing.ts            # Extra vs. invest comparison, CGT adjustment
│   └── format.ts               # ZAR, percent, date formatters
├── types/
│   └── index.ts                # All TypeScript interfaces
├── App.tsx                     # React Router route definitions
├── main.tsx                    # Entry point
└── index.css                   # Tailwind v4 + DaisyUI + CSS custom properties
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+

### Installation

```bash
git clone https://github.com/Sash3n/investment_calculator.git
cd investment_calculator
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Build for Production

```bash
npm run build
npm run preview
```

---

## South Africa–Specific Defaults

| Parameter | Default | Notes |
|---|---|---|
| Prime Rate | 11.25% | As of early 2025 |
| Bank service fee | R69/month | Typical bond admin fee |
| CGT effective rate | 18% | 40% inclusion × 45% marginal rate |
| Vacancy rate | 8% | ~1 month/year industry estimate |
| Management fee | 10% | Letting agent standard |
| Annual appreciation | 5% | Long-run SA property average |
| Effluent fees | R350/month | Municipal sewage charge |

---

## Key Financial Formulas

### Bond Repayment (PMT)
```
PMT = PV × [r(1+r)^n] / [(1+r)^n - 1]

where:
  PV = loan amount
  r  = monthly interest rate (annual rate / 12)
  n  = total number of payments (years × 12)
```

### Gross Rental Yield
```
Gross Yield = (Annual Rent / Purchase Price) × 100
```

### Net Cash Flow
```
Effective Rent = Monthly Rent × (1 - Vacancy Rate)
Management Fee = Effective Rent × Management Fee %
Cash Flow = Effective Rent - Bond Repayment - Levies - Rates
           - Insurance - Effluent - Misc - Management Fee
```

### ROI (5 / 10 Year)
```
Capital Gain   = Future Value - Purchase Price
Total Return   = Capital Gain + (Monthly Cash Flow × 12 × Years)
ROI %          = (Total Return / Deposit) × 100
```

### Car Finance with Balloon
```
Financed Amount = Loan Amount - Balloon Amount
Monthly PMT     = annuity(Financed Amount, rate, term)
Effective PMT   = max(Calculated PMT, Bank Minimum)
```

---

## Git Flow

```
main          ← stable releases
  └── dev     ← integration branch
        └── feature/*  ← individual features
```

Branches merged to `dev` then promoted to `main` for releases.

---

## Roadmap / Future Enhancements

- [ ] **Google Auth + Cloud Sync** — sign in with Google to persist saved properties and portfolios across devices (Firebase Auth + Firestore)
- [ ] **Sectional Title vs. Full-Title** comparison mode in Property ROI
- [ ] **Transfer duty calculator** integrated into Property ROI acquisition costs
- [ ] **Live Prime Rate feed** from SARB API
- [ ] **PDF export** for shareable reports (jsPDF)
- [ ] **Currency selector** for USD/EUR expats
- [ ] **Tax calculator** — rental income after-tax projections (SARS brackets)
- [ ] **Multi-currency mortgage** — rand-denominated bond on foreign-currency property

---

## License

MIT — free to use, modify, and distribute.

---

*Built for South African investors. All calculations are for informational purposes only and do not constitute financial advice.*
