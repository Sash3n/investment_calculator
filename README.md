# FinCalc ZA

> **Smart Investment Tools for South African Investors**
> A production-grade, dark-themed financial calculator suite built with React + TypeScript + Vite. Calibrated for South African conditions — ZAR, live SA Prime Rate, SARS 2026 tax brackets, JSE ETFs, CGT, transfer duty, TFSA, and more.

**Live:** [financial-calculator-za.vercel.app](https://financial-calculator-za.vercel.app)
**Repo:** [github.com/Sash3n/investment_calculator](https://github.com/Sash3n/investment_calculator)

---

## Features

30+ calculators organised into the same categories used by the sidebar, mobile nav, and command palette (`Ctrl/Cmd+K`).

### Dashboard
- **Search bar** filtering all calculator cards live by title, description, or tag
- **Category filter chips** to narrow the calculator grid instantly
- **Scenario presets** (e.g. "First-time Buyer") that pre-fill multiple related calculators at once — Mortgage, Bond Affordability, and Municipal Rates — each opened with realistic linked inputs in one click
- **Recently-used strip** surfacing your last 3 visited calculators
- Live SA reference-rate stat strip (live prime rate, average property appreciation, typical bond term, average JSE ETF return)

### Property & Loans

**Mortgage Calculator**
- Annuity-formula bond repayment (monthly & bi-weekly)
- Extra monthly payments + once-off lump-sum injection
- Full amortization schedule (collapsible, paginated)
- Interest saved & months saved vs. standard schedule
- Transfer duty (SARS 2026) + bond registration costs panel
- Upfront Cash Required summary (deposit + transfer duty + bond reg)
- Monthly bank service fee with true total-cost banner
- Live SA Prime Rate via SARB API (Vercel serverless proxy)
- Initiation fee can be capitalised into the loan instead of paid upfront
- PDF export (jsPDF, dark theme, amortization table) + Excel export (amortization schedule)
- Save & load snapshots (Google sign-in required)

**Property ROI Calculator**
- Dual rental scenario comparison (conservative vs. optimistic)
- Vacancy rate, management fee, full operating cost breakdown
- Transfer duty + bond registration costs in acquisition panel
- Initiation fee capitalisation toggle (finance into the bond vs. pay upfront cash)
- Gross yield, net yield, 5-year & 10-year ROI
- Property value + equity growth chart (10 years)
- Income vs. Expenses bar chart + cost composition pie chart
- **Portfolio Manager**: save multiple properties to Firestore
- Edit saved portfolio properties — one-click reload into calculator
- PDF export (jsPDF, dark theme, 10-year projection table) + Excel export (portfolio + 10-year projection sheets)

**Bond Affordability Qualifier**
- Max home loan & property price using SA bank rules: 30% instalment-to-income + NCA ~36% debt-to-income
- Live prime rate seeded as the default interest rate
- **Rate stress test** — how much your qualifying loan shrinks if rates rise
- Upfront cash needed (deposit + transfer duty + bond registration)
- "Can I afford this specific home?" target-price check with required-income estimate
- Income-allocation pie + affordability-vs-stress bar chart, education section

**Buy vs Rent**
- Full net-wealth simulation: buying (equity after CGT + ~2.5% sale costs, minus sunk costs) vs renting + investing the difference (portfolio after CGT, minus rent paid)
- Initiation fee capitalisation toggle
- Renter automatically invests the full upfront amount (deposit + transfer duty + bond registration + any cash initiation fee) plus the monthly saving whenever the bond payment exceeds rent
- SARS 2026/27 CGT modelling on both sides: R3m primary-residence exclusion for the buyer, R50k annual exclusion + 40% inclusion for the renter's portfolio
- Break-even year detection with a reference line on the net-wealth chart, plus an annual running-cost bar chart and full year-by-year comparison table
- Adjustable comparison period (5/10/15/20/25/30 years)

**Rental Yield Finder**
- Computes gross yield, net yield (after all running costs), monthly cash flow, and the exact breakeven rent needed to cover costs after the agent's percentage fee
- Upfront cost breakdown: deposit, initiation fee (with an "add to loan instead of cash" toggle), auto-calculated transfer duty and bond registration
- Monthly cost inputs include bond payment, levy, rates, insurance, maintenance (% of price p.a.), agent fee (%), effluent, and misc costs
- Vacancy input (months/year) reduces effective annual rent for the net-yield calculation
- Cash-flow-vs-rent line chart showing how cash flow and gross yield change across a range of rent levels, with the breakeven point marked
- 10-year projection chart combining equity growth (7% p.a. appreciation) with cumulative net cash flow

**Airbnb vs Long-term Rental**
- Compares short-term letting vs a traditional lease on the same property
- Net operating income (before bond, like-for-like), net yield, and after-bond monthly cash flow for each
- **Break-even occupancy** — the Airbnb occupancy needed to match the long-term lease
- Models platform fees, cleaning per stay, co-host/management %, utilities, and vacancy
- Winner banner, side-by-side comparison table, income-breakdown chart, education section

**Loan Comparison**
- Compare up to 3 loan offers side-by-side, each with its own amount, rate, term, initiation fee, monthly service fee
- Initiation fee capitalisation per loan option — independently choose per offer whether the fee is financed into the loan or paid upfront
- Auto-calculates transfer duty and bond registration cost per loan (both overridable per option)
- Declares "Lowest Monthly Payment" and "Lowest Grand Total (all costs)" winners with a trophy badge
- Full side-by-side comparison table plus an outstanding-balance-over-time line chart per loan

**Bond Extra Payment**
- Extra monthly payment, annual lump sum (e.g. bonus), and a bi-weekly payment schedule toggle (26 half-payments/yr = 13 full payments)
- Side-by-side amortization: standard schedule vs with-extra schedule, with interest saved and time saved (yrs/months) call-outs
- Outstanding balance area chart (standard vs with extra) plus a collapsible year-by-year amortization table

**Municipal Rates Calculator**
- Covers 7 SA metros: Johannesburg, Cape Town, Tshwane, Ekurhuleni, eThekwini (Durban), Nelson Mandela Bay, and Buffalo City (East London) — each with its own 2025/26 rate-in-the-rand, standard rebate threshold, pensioner rebate %, refuse/sewerage/basic-service charges, and tiered water tariff
- Editable rate-in-the-rand override with one-click reset to default
- Electricity basic charge on top of rates/water/sewerage/refuse/basic-services
- Rebate type selector: standard, pensioner, or indigent (full exemption)
- Tiered water calculator with a reference table of the active city's tiers
- Bill-composition donut chart, monthly breakdown table, and a move-city savings callout highlighting the cheapest municipality and the Rand/year saving from relocating
- 5-year cost projection using an adjustable annual tariff escalation %, plus a cross-city comparison bar chart

### Income & Budget

**Salary Calculator**
- PAYE/UIF calculation against the current SA tax year, with employee UIF (1%) and medical aid tax credits
- 2nd/3rd income fields — add up to 3 named income streams (e.g. primary job + freelance + rental)
- Age-group selector (Under 65 / 65–74 / 75+) applies the correct SARS rebates
- Monthly/Annual toggle, RA contribution field with the resulting PAYE saving quantified
- Deductions pie chart and a gross-vs-net bar chart across a spread of salary levels

**Budget Planner**
- Real transaction tracker — log income/expense transactions with description, amount, date and a custom tag
- SA-relevant default tags seeded on first use (Salary, Rental Income, Medical Aid, Rates & Levies, etc.), each editable, addable, deletable, colour-coded
- Monthly and quarterly views with month navigator; KPI strip for income, expenses, net, and savings rate (colour-graded)
- Expense and income breakdown donut charts by tag, plus a quarterly income-vs-expenses bar chart
- Synced to Firestore under the signed-in user's account

**Debt Snowball**
- Add unlimited debts (balance, interest rate, minimum payment) and simulate payoff under **Snowball** (smallest balance first) or **Avalanche** (highest rate first) strategy
- Extra monthly payment field, with minimums from paid-off debts automatically rolling onto the next target debt
- Side-by-side strategy comparison bar chart (months to debt-free and total interest) with a callout quantifying which strategy saves more
- Payoff-order list and a total-balance-over-time line chart

**Emergency Fund**
- Target fund = monthly essential expenses × a chosen number of months (3/6/9/12), with a recommendation driven by a job-security selector
- Months-to-target solver based on current balance, monthly contribution and chosen vehicle's interest rate
- 4 vehicle options (Money Market, High-Interest Savings, Notice Deposit, Unit Trust/MMTF)
- Progress bar and a fund build-up area chart with a target reference line

**Provisional Tax**
- Combines employment, freelance and other income, applies the current SARS tax brackets, and splits the liability between PAYE already withheld and the provisional tax owed on the rest
- RA contribution slider with live tax saving, bounded to the allowable deduction (27.5% of income, capped)
- 1st (31 Aug) / 2nd (28 Feb) payment period selector with the exact amount due and monthly set-aside
- 90%-of-final-liability penalty threshold callout (20% penalty risk on the shortfall)

**Retrenchment Calculator**
- UIF benefit calculation — sliding income-replacement rate (38%–58%) based on daily income, capped at the income ceiling, with credit-days-based entitlement (up to 34 weeks)
- Notice pay tiers per BCEA (1/2/4 weeks by tenure)
- Leave days payout and severance pay (1 week per completed year of service) taxed via the cumulative retirement lump-sum table
- Total net payout, months of expense "runway" from lump sums alone, plus combined runway once UIF weeks are added

**VAT Calculator**
- Add or extract 15% VAT from an amount, with a VAT-registration threshold checker estimating months until you'll hit the mandatory-registration turnover
- Line-item invoice mode with mixed taxability — build a multi-line invoice where each line can be toggled taxable/non-taxable (zero-rated or exempt items), auto-summing taxable subtotal, non-taxable subtotal, VAT, and grand total
- Quick-reference card: VAT rate, registration thresholds, return periods, late-registration penalty

### Vehicles

**Car Finance Calculator**
- Balloon payment support (common SA practice)
- Bank-quoted minimum instalment override with warning banner
- Monthly service fee (e.g. Wesbank R69/month)
- Extra monthly payment with interest-saved & months-saved summary
- Depreciation schedule (Year 1: 15%, Year 2: 12%, Year 3+: 10%)
- Underwater months detection (loan balance > vehicle value)
- Opportunity cost comparison: cash purchase vs. financed
- Full amortization table — Standard & With Extras tabs, paginated
- PDF export + Excel export (summary sheet)
- Save & load snapshots (Google sign-in required)

**Car: Extra vs Investing**
- Compares paying extra on a car loan (with optional balloon payment) vs investing the same amount in an ETF/TFSA/money market/custom vehicle
- Vehicle presets with default returns and an adjustable effective CGT rate
- Winner banner declares whether "pay extra" or "invest instead" comes out ahead over the loan term, with the Rand margin
- Year-by-year line chart and table showing interest saved vs after-tax portfolio value

### Investing & Tax

**Extra Payments vs. JSE ETF Investing**
- Side-by-side: paying extra into your bond vs. investing the same amount
- JSE ETF benchmarks: Satrix 40 (13%), S&P 500 ETF (18%), Sygnia Itrix (15%), Ashburton (14%)
- South African CGT applied on ETF returns
- Inflation-adjusted comparison
- Year-by-year table + clear winner callout with rand advantage
- Excel export (summary sheet)
- Save & load snapshots (Google sign-in required)

**Wealth Target Planner**
- Dual-mode: Target → Monthly needed (solves the contribution required to hit a Rand goal) or Monthly → Final value (project forward from a fixed contribution)
- 4 investment vehicle presets (TFSA, S&P 500/Global ETF, JSE/Satrix 40, Fixed Deposit/Money Market) with an overridable rate
- **3-scenario comparison** — Conservative, Current, and Aggressive (±2% return), each with real (inflation-adjusted) value
- TFSA guardrails: warns if the required contribution exceeds the annual limit or lifetime cap
- "Cost of waiting 2 years" callout, milestone tracker (R100k–R10M), and a contributions-vs-returns stacked area chart

**Offshore Allowance Planner**
- Models the R1,000,000/year Single Discretionary Allowance and the R10,000,000/year Foreign Investment Allowance
- USD, EUR and GBP currency options, each with its own default spot rate and offshore return assumption
- Models ZAR depreciation per annum compounding against offshore returns, converting back to ZAR terms year by year
- Local (JSE) vs offshore comparison line chart, with an advantage callout explaining which side wins and why

**Investment Strategy Calculator**
- Gross-to-net salary breakdown with PAYE, UIF, SDL
- RA vs. TFSA vs. direct ETF contribution optimisation
- Monthly tax saving from RA contributions
- 2-Pot retirement system modelling
- Recommended strategy tag based on income and goals
- Exact ZAR figures displayed (no abbreviated K/M values)
- Excel export of the full breakdown

**Property Tax Planner**
- **Rental Income Tax** — SARS 2026 brackets, all allowable deductions (bond interest, rates, levies, insurance, repairs, management fee), marginal rate on rental income
- **Section 13sex** — new residential unit depreciation allowance (5% / 10% for 20 / 10 years), fully **multi-unit**:
  - Each unit has its own price, rent, bond, levies, rates, insurance, management fee and vacancy
  - **Import from Portfolio** — pull saved Property ROI properties straight in as units
  - **RA stacking** — model a retirement-annuity contribution alongside the S13 allowance and see the combined tax saving
  - Per-unit analysis table (yield, cash flow), portfolio cash-flow chart, year-by-year schedule, and an in-page education section
- **Section 13quat (UDZ)** — Urban Development Zone allowances (new/improvements/low-cost), full deduction schedule
- **CGT Planner** — primary residence exclusion (R3M, 2026), annual exclusion (R50k), 40% inclusion rate, net proceeds after CGT, joint ownership support

**Tax Projections (Multi-Year)**
- Year-by-year rental tax forecast over 5–20 year hold period
- Rent escalation modelling (configurable % p.a.)
- Declining bond interest deductions as loan amortises
- Annual net rental profit vs. tax paid (bar chart)
- Cumulative net cash vs. cumulative tax (area chart)
- CGT at each potential exit year — full table with optimal exit ★
- Total Return = net sale proceeds + cumulative rental net − purchase price

**Dividend Income**
- Projects dividend income for SA or International holdings with **DRIP** (reinvestment) toggle and recurring monthly contributions
- **TFSA wrapper toggle** — exempts SA Dividends Tax entirely, with a callout quantifying the extra Rand kept vs a taxable account
- SA Dividends Tax (20%) or International withholding tax applied automatically based on market selection
- **Income-goal reverse calculator** — enter a target monthly income and it solves the capital required, flagging which year (if any) your plan reaches it
- Yield-on-cost tracking (income as % of original capital)
- Portfolio growth + cumulative income (area) and DRIP vs no-DRIP annual income (bar) charts, plus a full year-by-year table

**Optimal Exit Planner**
- Answers "when should I sell?" across years 1 / 3 / 5 / 10 / 15 / 20 / 25
- Combines **CGT**, **Section 13sex recoupment** (allowances clawed back as income on sale), and your marginal rate
- Surfaces the recoupment trap and the **net lifetime tax position** (S13 savings received − tax paid on exit)
- Best-cash-year and best-tax-year callouts, net-proceeds vs exit-tax chart, scenario table, education section

**TFSA Optimizer**
- Lifetime allowance tracker (R500k) with animated progress bar
- Annual contribution cap enforcement (R46,000/year, SARS 2026/27)
- TFSA vs. taxable investment comparison (same balance, same contributions)
- Tax drag modelling by investment type (ETF, balanced fund, cash/money market)
- TFSA vs. taxable area chart (compounding divergence over time)
- Annual tax avoided bar chart
- Year-by-year table with lifetime-maxed marker (★)
- Key SARS rules callout (limits, withdrawal rules, zero-tax guarantee)

**RA Planner (Retirement Annuity)**
- Models the 27.5%-of-income RA deduction capped at R430,000 (2026/27 Budget increase), with an over-contribution warning showing the non-deductible excess carries forward tax-free
- Full **2-Pot system** simulation: Savings Pot (1/3, accessible from 55) and Retirement Pot (2/3, must be annuitised), tracked alongside a legacy Vested Pot (pre-Sep 2024 rules)
- "SARS Subsidy" callout showing your contribution, what SARS effectively pays via the deduction, and your true out-of-pocket cost
- Retirement lump-sum tax table applied to the vested-pot lump sum, with a de minimis (<R360,000) full-commutation notice
- Living annuity drawdown modelling bounded to FSCA's 2.5%–17.5% range
- **RA vs ETF comparison** at equal out-of-pocket cost
- Pot-growth stacked area chart, retirement-age scenario table (55/60/65), full year-by-year breakdown

**FIRE Calculator**
- Computes your FIRE number and years-to-FIRE from current savings, monthly contribution, expected return and SA-adjusted inflation
- **SWR picker** — 3% / 3.5% / 4% safe withdrawal rate cards, each showing the resulting FIRE number and years to reach it
- On-track banner comparing your projected balance at target retirement age against the FIRE number, with surplus/shortfall in Rand
- **Coast FIRE** calculation — the balance needed today to compound (with no further contributions) to your FIRE number by your target age
- "Years saved by contributing more" bar chart testing extra monthly contribution amounts
- Portfolio-vs-target area chart and a year-by-year table flagging FIRE/Coast/Target rows

**Retirement Income Goal**
- Dual-mode toggle: "I know my desired income" (solves required monthly investment) vs "I know what I can afford" (solves achievable income from a savings-rate %)
- **Contribution escalation** — grows your monthly contribution each year rather than assuming a flat contribution
- **Start-later penalty** — quantifies exactly how much more you'd need per month, or how much your achievable income drops, if you delay starting by 2 years
- **Drawdown sustainability check** — simulates spending down the nest egg in retirement, flagging the depletion age if the money runs out or confirming it lasts
- Bidirectional affordability mode lets you switch framing without re-entering most inputs; both modes share the SWR picker and growth/drawdown charts
- Conservative/Current/Aggressive scenario comparison cards
- Cross-links to the FIRE Calculator and Wealth Target Planner

### Planning

**Net Worth Dashboard**
- Full balance-sheet tracker: 8 asset categories and 5 liability categories
- Live KPIs: total assets, total liabilities, net worth, and debt-to-asset ratio (colour-graded)
- Assets-vs-liabilities breakdown bar chart
- **Save Snapshot** to Firestore, building a net-worth trend area chart once 2+ snapshots exist
- Collapsible snapshot history with delete-per-snapshot

**Portfolio Summary**
- Aggregate view across all saved Property ROI properties
- Total portfolio value, equity, outstanding debt, monthly cash flow, blended yield
- Monthly cash flow bar chart (green/red per property)
- Gross vs. net yield comparison bar chart
- Equity growth area chart (per-property series)
- Per-property breakdown table with totals row
- One-click "Open" to load any property back into the ROI calculator

**Portfolio Stress Test**
- Reads your saved Property ROI portfolio — **no extra data entry**
- Runs every property through adverse scenarios: prime +1/+2/+3%, 15% vacancy, −10% value, and a combined worst case
- Monthly cash-flow matrix (property × scenario) with negatives flagged
- **Breaking-point rate** per property — the interest rate at which it turns cash-flow negative — plus rate headroom
- Most-fragile property callout, portfolio totals, and a how-to-read-it education section

**Inflation Calculator**
- Shows purchasing-power erosion of a Rand amount over a chosen horizon, alongside what it grows to if invested at a separate return rate
- Inflation presets: SA Average CPI, High, Low, Education, Medical
- Real return calculation with a warning callout when real return is below ~2% (or negative)
- Rule of 72 callout showing price-doubling time vs investment-doubling time
- Combined area chart: investment growth, purchasing power decay, and the inflation-adjusted target

**Education Savings**
- Preset education types (Public/Private University, Private/Semi-private School) with default today's-cost and education-inflation rate per preset
- Projects the first-year and total future cost, and the projected savings fund at study-start
- Funding-gap/surplus banner plus the exact monthly contribution required to close the gap
- Compares 4 savings vehicles side-by-side against the total cost target
- Savings build-up line chart to the study start year; deep link to the TFSA Optimizer

### History
- All saved snapshots from every calculator in one place
- Open any snapshot — navigates to the correct calculator in edit mode
- Delete individual entries or clear all history
- **Comparison Mode** — select any two saved snapshots of the same calculator type for a side-by-side A/B table with diff column (green = better, red = worse, per metric); supports Mortgage, Property ROI, Car Finance

### Learn
**Financial Education (Learn Hub)**
- 14 SA financial-education articles across 5 categories — Investing, SA Tax, Property, Debt & Budgeting, and FIRE & Macro
- Each article has a category badge, estimated read time, and a "Put it into practice" CTA deep-linking to the matching calculator
- Structured sections with headings, tip callouts and warning callouts
- Search-by-keyword and category-filter chips on the hub page; related articles and a back-to-hub link on each article

### Save / Load Snapshots (all calculators)
- **Google sign-in** — one-click Google Auth via Firebase
- **Save snapshot** — captures current inputs + key result as a named entry
- **Edit mode** — load saved snapshot back, overwrite same Firestore document
- **Rename** — inline title editing without touching inputs
- **New** button — exit edit mode to save a fresh snapshot
- Synced to Firestore, accessible across devices

### App-wide
- **Route-based code splitting** — calculator pages are lazy-loaded as on-demand chunks; heavy libs (jsPDF, xlsx, html2canvas, Recharts) load only when their page is opened
- **Command palette (Ctrl/Cmd+K)** — global fuzzy search over every calculator by label, keyword, and category, with keyboard navigation and a "Recent" section when the query is empty
- **Favourites & recently-used calculators** — pin favourites and track up to 6 recently-visited calculators, persisted to `localStorage` and synced live across tabs
- **Shareable scenario links** — most standalone calculators can URL-encode the full input state into a `?s=` query param, so a scenario can be bookmarked or shared
- **Input persistence** — several calculators restore your last inputs from `localStorage` on return, with a one-click reset to defaults
- **Live thousands-separator formatting** in Rand input fields (caret-preserving as you type)
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
| Auth | Firebase Auth (Google) | 12.x |
| Database | Firebase Firestore | 12.x |
| Hosting | Vercel (+ serverless functions) | — |

---

## Project Structure

```
src/
├── components/
│   ├── Layout/
│   │   └── AppShell.tsx          # Sidebar, header, mobile nav, theme toggle, auth
│   ├── CommandPalette.tsx        # Ctrl/Cmd+K fuzzy search across all calculators
│   └── ui/
│       ├── InputField.tsx        # Rand input with live thousands separators
│       ├── SelectField.tsx
│       ├── StatCard.tsx
│       ├── SectionHeader.tsx
│       ├── EmptyState.tsx
│       ├── ShareButton.tsx       # Encodes scenario state into a shareable ?s= link
│       └── SaveLoadBar.tsx       # Reusable save/load/edit panel
├── config/
│   ├── nav.ts                    # Single source of truth for sidebar/nav/palette categories
│   └── presets.ts                # Cross-calculator scenario presets (e.g. First-time Buyer)
├── context/
│   └── AuthContext.tsx           # Firebase Auth provider
├── data/
│   └── learn.ts                  # Financial education article content
├── hooks/
│   ├── useFirestore.ts           # useSavedProperties + useHistory hooks
│   ├── usePrimeRate.ts           # Live SARB prime rate fetch + sessionStorage cache
│   ├── useNavPrefs.ts            # Pinned favourites + recently-used calculators
│   ├── useRecentCalcs.ts
│   └── usePersistentState.ts     # localStorage-backed state with reset-to-default
├── lib/
│   └── firebase.ts               # Firebase initialisation
├── pages/                        # One page per calculator/tool (30+), see Features above
├── utils/
│   ├── mortgage.ts, roi.ts, car.ts, investing.ts, tax.ts, affordability.ts,
│   │   stress.ts, shortTermRental.ts, exitPlanner.ts, investmentStrategy.ts,
│   │   retirementIncome.ts       # Calculation logic per calculator
│   ├── pdf.ts                    # jsPDF exporters (Mortgage, Property, Car)
│   ├── share.ts                  # Encode/decode shareable scenario links
│   └── format.ts
├── types/
│   └── index.ts
├── test/                         # Vitest unit tests for core calculation utils
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
| RA deduction cap | R430,000 | 27.5% of income, increased from R350k in 2026/27 budget |
| Bond term | 20 years | SA standard |
| Bank service fee | R69/month | Typical bond admin fee |
| Vacancy rate | 8% | ~1 month/year industry estimate |
| Management fee | 10% | Letting agent standard |
| Annual appreciation | 5% | Long-run SA property average |
| VAT rate | 15% | Mandatory registration at R1,000,000/12mo turnover |
| Single Discretionary Allowance | R1,000,000/year | No SARB approval required |
| Foreign Investment Allowance | R10,000,000/year | Requires SARB approval + Tax Compliance Status |

---

## Roadmap

### Shipped
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
- [x] Command palette (Ctrl/Cmd+K), pinned favourites & recently-used calculators
- [x] Shareable scenario links + localStorage input persistence
- [x] Dividend Income Calculator (DRIP, TFSA wrapper, income-goal reverse calc)
- [x] FIRE Calculator (SWR picker, Coast FIRE)
- [x] RA Planner (2-Pot system, RA vs ETF comparison)
- [x] Net Worth Dashboard (assets/liabilities tracker with snapshots)
- [x] Budget Planner (transaction tracker with tags and charts)
- [x] Debt Snowball / Avalanche payoff planner
- [x] Salary, Provisional Tax, VAT, Municipal Rates, Retrenchment calculators
- [x] Buy vs Rent, Rental Yield Finder, Loan Comparison, Bond Extra Payment
- [x] Wealth Target Planner, Offshore Allowance Planner, Emergency Fund, Education Savings, Inflation Calculator
- [x] Car: Extra Payment vs Investing
- [x] Retirement Income Goal calculator (bidirectional affordability, drawdown sustainability check)
- [x] Initiation fee capitalisation across Mortgage, Property ROI, Rental Yield, Buy vs Rent, and Loan Comparison
- [x] Financial Education Learn Hub (14 SA financial-literacy articles)

### Up next
- [ ] Excel export for the remaining calculators (currently: Mortgage, Property ROI, Car Finance, Investment Strategy, Extra vs Investing)
- [ ] PDF export for the remaining calculators (currently only Mortgage, Property ROI, and Car Finance support PDF)
- [ ] Multi-currency / multi-country mode for South Africans investing or relocating abroad
- [ ] Scenario planner: chain multiple calculators into one life-event walkthrough (e.g. buy a home → have a child → retire)
- [ ] Push/email reminders for provisional tax deadlines and TFSA/RA contribution room
- [ ] Collaborative snapshots — share a saved scenario with a partner or advisor for comment
- [ ] Historical SA Prime Rate chart (beyond the current live snapshot)
- [ ] Automated annual updates to SARS tax brackets, TFSA/RA limits, and CGT thresholds each Budget Speech
- [ ] Offline/PWA support for use with unreliable connectivity
- [ ] Broader unit test coverage (utils currently covered: mortgage, roi, car, investing, tax, retirementIncome)

---

## License

MIT — free to use, modify, and distribute.

---

*Built for South African investors. All calculations are for educational purposes only and do not constitute financial advice. Consult a certified financial planner (CFP) or SARS-registered tax practitioner before making financial decisions.*
