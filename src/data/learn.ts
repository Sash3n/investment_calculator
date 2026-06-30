export interface ArticleSection {
  heading?: string;
  body: string;
  tip?: string;   // highlighted callout
  warn?: string;  // warning callout
}

export interface Article {
  slug:        string;
  title:       string;
  summary:     string;     // one-line used on hub cards
  category:    ArticleCategory;
  readMins:    number;
  calcPath?:   string;     // CTA link — path to the relevant calculator
  calcLabel?:  string;     // label for the CTA button
  sections:    ArticleSection[];
}

export type ArticleCategory =
  | 'investing'
  | 'tax'
  | 'property'
  | 'debt'
  | 'fire';

export const CATEGORY_META: Record<ArticleCategory, { label: string; color: string; emoji: string }> = {
  investing: { label: 'Investing',        color: '#6366F1', emoji: '📈' },
  tax:       { label: 'SA Tax',           color: '#F59E0B', emoji: '🧾' },
  property:  { label: 'Property',         color: '#10B981', emoji: '🏠' },
  debt:      { label: 'Debt & Budgeting', color: '#EC4899', emoji: '💳' },
  fire:      { label: 'FIRE & Macro',     color: '#EF4444', emoji: '🔥' },
};

export const ARTICLES: Article[] = [
  // ── INVESTING ──────────────────────────────────────────────────────────────
  {
    slug: 'compound-interest',
    title: 'How Compound Interest Works — and Why Starting Early Beats Earning More',
    summary: 'The maths behind the most powerful force in personal finance.',
    category: 'investing',
    readMins: 5,
    calcPath: '/wealth-target',
    calcLabel: 'Model it in the Wealth Target Planner',
    sections: [
      {
        heading: 'What is compound interest?',
        body: `Compound interest means you earn returns not just on your original capital, but on every rand of growth you've already accumulated. Each period, your interest earns interest — and over long timescales, this creates exponential rather than linear growth.

Simple interest: R10 000 × 10% × 20 years = R20 000 profit.
Compound interest: R10 000 × 10% compounded annually for 20 years = R67 275 — more than three times as much.`,
      },
      {
        heading: 'The formula',
        body: `Future Value = Principal × (1 + r)^n

Where r is the periodic rate and n is the number of periods. Monthly compounding (most SA unit trusts and ETFs) uses r = annual rate ÷ 12 and n = months, giving you slightly more than annual compounding because you're reinvesting 12 times per year instead of once.`,
      },
      {
        heading: 'Why starting early beats earning more',
        body: `Consider two investors, both targeting retirement at 65:

• Thabo starts at 25, invests R1 500/month at 11% p.a., then stops at 35 (10 years of contributions).
• Sipho starts at 35, invests R1 500/month at 11% p.a. all the way to 65 (30 years of contributions).

Thabo contributes R180 000. Sipho contributes R540 000 — three times as much. Yet at 65, Thabo has more money. His 10 extra years of compounding more than compensate for 30 fewer years of deposits.

This is the cost of delay: every year you wait, you need to contribute more to hit the same outcome.`,
        tip: 'The best time to start investing was 20 years ago. The second best time is today.',
      },
      {
        heading: 'Practical SA context',
        body: `The JSE All Share has returned roughly 11-13% per annum over the last 30 years (nominal, before inflation). At 11% nominal and 5.5% inflation, your real return is about 5.2% — which is still enough to double your purchasing power roughly every 14 years.

TFSA accounts let you earn these compound returns completely tax-free (no income tax on interest, no dividends tax, no CGT). Maximising your TFSA contribution (R36 000/year as of 2025/26, lifetime cap R500 000) is usually the first stop for long-term SA investors.`,
      },
    ],
  },
  {
    slug: 'etfs-explained',
    title: 'ETFs Explained: JSE Satrix, S&P 500 Funds, and How to Choose',
    summary: 'What exchange-traded funds are, how they trade on the JSE, and which to consider.',
    category: 'investing',
    readMins: 6,
    calcPath: '/wealth-target',
    calcLabel: 'Model ETF growth in the Wealth Target Planner',
    sections: [
      {
        heading: 'What is an ETF?',
        body: `An ETF (Exchange-Traded Fund) is a basket of securities — shares, bonds, or commodities — that trades on a stock exchange exactly like a single share. When you buy one unit of the Satrix 40 ETF, you instantly own a proportional slice of the 40 largest companies on the JSE.

ETFs are passively managed: they track an index rather than having a fund manager pick stocks. This keeps costs extremely low — the Satrix 40 TER (Total Expense Ratio) is around 0.10% per year, versus 1-2%+ for an actively managed unit trust.`,
        tip: 'Over 15-20 year horizons, most actively managed funds in SA underperform their benchmark index after fees.',
      },
      {
        heading: 'Popular JSE-listed ETFs',
        body: `• Satrix 40 (STX40) — tracks the FTSE/JSE Top 40, SA's 40 largest companies by market cap. Cheap (0.10% TER), liquid, rand-denominated.

• Satrix MSCI World (STXWDM) — tracks the MSCI World index, giving you exposure to ~1 500 companies across 23 developed markets in a single JSE-listed, rand-denominated ETF. TER ~0.35%.

• Ashburton Global 1200 (GLODIV) — broader global exposure with a dividend tilt.

• Satrix S&P 500 (STX500) — tracks the 500 largest US companies. One of the most popular global equity ETFs on the JSE.

• Sygnia Itrix MSCI Emerging Markets (SYG500) — adds developing-market exposure.`,
      },
      {
        heading: 'Offshore vs local: what the numbers say',
        body: `SA makes up less than 1% of global market cap. An all-JSE portfolio is a concentrated bet on a single emerging-market economy. Most SA financial planners recommend holding 30-60% offshore for diversification.

The rand has depreciated roughly 5-7% per year against the dollar over the last 20 years. This actually boosts rand returns on offshore ETFs — but it's a double-edged sword when the rand strengthens.`,
        warn: 'You have a R1 million Single Discretionary Allowance and a R10 million Foreign Investment Allowance per year (SARS clearance required for the larger amount). ETFs listed on the JSE like STXWDM let you get offshore exposure without using your allowance at all.',
      },
      {
        heading: 'TFSA vs RA for ETF investing',
        body: `TFSA: No tax on growth or withdrawals. Flexible — withdraw any time. R36 000/year contribution limit, R500 000 lifetime cap.

RA: Contributions are tax-deductible (up to 27.5% of income, max R350 000/year). Growth is tax-free inside the fund. But you can't access funds before age 55, and at retirement two-thirds must be used to purchase an annuity.

For most people under 45: max the TFSA first (tax-free, flexible), then use an RA for the deduction benefit once the TFSA is maxed.`,
      },
    ],
  },
  {
    slug: 'tfsa-vs-ra',
    title: 'TFSA vs Retirement Annuity: Which Should You Prioritise?',
    summary: 'A practical framework for choosing between SA\'s two main tax-advantaged wrappers.',
    category: 'investing',
    readMins: 5,
    calcPath: '/tfsa',
    calcLabel: 'Model your TFSA in the TFSA Optimizer',
    sections: [
      {
        heading: 'The core difference',
        body: `Both accounts shelter your investment growth from tax. The difference is timing and flexibility:

TFSA (Tax-Free Savings Account):
• Contributions are from after-tax money (no upfront deduction).
• All growth — interest, dividends, capital gains — is permanently tax-free.
• Withdraw at any time, no penalties.
• Contribution limit: R36 000/year, R500 000 lifetime.

Retirement Annuity (RA):
• Contributions are tax-deductible up to 27.5% of taxable income (max R350 000/year) — you save tax now.
• Growth inside the fund is tax-free.
• Can't withdraw before age 55 (with limited exceptions).
• At retirement: one-third can be taken as a lump sum (partly tax-free), two-thirds must buy an annuity.`,
      },
      {
        heading: 'When the RA wins',
        body: `If you're in the 36-45% marginal tax bracket and have a long investment horizon (15+ years to retirement), the RA's upfront deduction is very powerful. A R10 000 contribution effectively costs you only R5 500 if you're in the 45% bracket — the government funds R4 500 of it via your tax saving.

The 2-Pot system (effective 1 September 2024) now lets you access one-third of future RA contributions before retirement as a "savings pot", reducing the liquidity concern significantly.`,
        tip: 'Contribute enough to your RA to reduce your taxable income to the next lower bracket, then switch to TFSA for anything above that.',
      },
      {
        heading: 'When the TFSA wins',
        body: `If you're in the 18-26% tax bracket, the upfront deduction is modest and the RA's withdrawal restrictions become the dominant factor. The TFSA's full flexibility — withdraw for emergencies, education, a deposit — makes it the better choice.

Also, the TFSA's R500 000 lifetime cap means you should start early: the sooner you fill it, the more compound growth occurs tax-free.`,
      },
      {
        heading: 'A practical rule of thumb',
        body: `1. Emergency fund first (3-6 months expenses in a money market account).
2. Max TFSA (R36 000/year) — prioritise this before 30.
3. If marginal rate is ≥ 31%: contribute to RA up to the point where your taxable income drops to the next bracket.
4. Any remaining savings: discretionary unit trusts or ETFs (JSE-listed for rand-denominated offshore exposure).`,
      },
    ],
  },
  {
    slug: 'dividend-investing',
    title: 'Dividend Investing and DRIP: Building Passive Income on the JSE',
    summary: 'How dividends work in SA, Dividends Tax, and the power of dividend reinvestment.',
    category: 'investing',
    readMins: 5,
    calcPath: '/dividend-calculator',
    calcLabel: 'Model dividend income in the Dividend Calculator',
    sections: [
      {
        heading: 'What is a dividend?',
        body: `A dividend is a cash payment made by a company to its shareholders, typically from profits. JSE-listed companies like Naspers, Capitec, Standard Bank, and Redefine Properties pay dividends quarterly or semi-annually.

Dividends represent income on top of capital growth — useful for retirees needing regular cash flow, and for younger investors who reinvest them to supercharge compounding.`,
      },
      {
        heading: 'Dividends Tax in South Africa',
        body: `SA imposes a 20% Dividends Withholding Tax (DWT) on dividends paid to individual shareholders. It's withheld at source by the company or broker — you never see it hit your account.

Important exceptions:
• Dividends inside a TFSA are exempt from DWT — another strong reason to hold dividend-paying stocks in your TFSA.
• SA-resident companies paying dividends to other SA companies are exempt (the inter-company exemption).
• Some foreign dividends are taxed as income, not at the 20% DWT rate.`,
        tip: 'Hold your highest-yielding dividend stocks inside your TFSA to shelter the 20% DWT completely.',
      },
      {
        heading: 'DRIP: Dividend Reinvestment Plans',
        body: `A DRIP (Dividend Reinvestment Plan) automatically uses your dividends to purchase additional shares instead of paying them out as cash. Over time, this compounds your holding — you own more shares, which pay more dividends, which buy more shares.

Not all JSE-listed shares offer formal DRIPs, but most retail brokers (EasyEquities, Satrix, Ninety One) allow you to set an automatic "buy" instruction using dividend proceeds when they land in your account.`,
      },
      {
        heading: 'Yield on Cost vs Current Yield',
        body: `Current yield = annual dividend ÷ current share price. This is what you see quoted.

Yield on cost = annual dividend ÷ your original purchase price. As a company grows its dividend over years, your yield on cost rises — even if the current yield stays flat because the share price rose too.

Long-term dividend investors in quality compounders (Capitec was paying a R3/share dividend when it listed; it now pays R60+) find their yield on cost far exceeds what any bond or savings account offers.`,
      },
    ],
  },
  // ── SA TAX ─────────────────────────────────────────────────────────────────
  {
    slug: 'paye-explained',
    title: 'How PAYE Works in South Africa — Tax Brackets, Rebates, and Take-Home Pay',
    summary: 'Understanding SARS\'s pay-as-you-earn system and what actually affects your net salary.',
    category: 'tax',
    readMins: 5,
    calcPath: '/salary',
    calcLabel: 'Calculate your take-home pay',
    sections: [
      {
        heading: 'What is PAYE?',
        body: `PAYE (Pay As You Earn) is the system by which employers withhold income tax from employees' salaries and remit it to SARS monthly. As an employee you never have to file a provisional tax return — your employer does the heavy lifting — but you're still responsible for an annual tax return (ITR12) if your income exceeds the threshold.

SARS requires employers to withhold tax based on each employee's projected annual income, applying the progressive tax table and subtracting eligible rebates each month.`,
      },
      {
        heading: 'The 2025/26 tax brackets',
        body: `South Africa uses a progressive tax system:

• R0 – R237 100: 18%
• R237 101 – R370 500: R42 678 + 26% on the amount above R237 100
• R370 501 – R512 800: R77 362 + 31% on the amount above R370 500
• R512 801 – R673 000: R121 475 + 36% on the amount above R512 800
• R673 001 – R857 900: R179 147 + 39% on the amount above R673 000
• R857 901 – R1 817 000: R251 258 + 41% on the amount above R857 900
• Above R1 817 000: R644 489 + 45% on the amount above R1 817 000

These brackets are for the 2025/26 tax year (1 March 2025 – 28 February 2026).`,
        tip: 'The rate shown is the marginal rate — only the rand earned in that band is taxed at that rate. Your average (effective) tax rate is always lower.',
      },
      {
        heading: 'Primary, secondary, and tertiary rebates',
        body: `Before SARS collects a cent, rebates are subtracted from your tax liability:

• Primary rebate (all taxpayers): R17 235 (2025/26) — effectively means you pay zero tax on income up to ~R95 750.
• Secondary rebate (age 65+): R9 444
• Tertiary rebate (age 75+): R3 145

This is why the "tax threshold" — the income below which you owe no tax — is around R95 750 for those under 65.`,
      },
      {
        heading: 'UIF and other deductions',
        body: `UIF (Unemployment Insurance Fund): 1% of gross salary, capped at a monthly remuneration ceiling of R17 712 — meaning max UIF contribution is R177.12/month. Your employer matches this contribution.

Medical Aid Credits: reduce your tax liability by a fixed amount per month (R364 for the main member, R246 for each additional adult dependant, and R246 for the first two child dependants as of 2025/26). These come off your tax bill directly, not just your taxable income.

Retirement fund contributions: up to 27.5% of the greater of remuneration or taxable income (max R350 000/year) are deductible, reducing the gross income on which your PAYE is calculated.`,
      },
    ],
  },
  {
    slug: 'capital-gains-tax',
    title: 'Capital Gains Tax in South Africa: What Triggers It and How to Minimise It',
    summary: 'How SARS taxes profits on shares, property, and other assets — and legal ways to reduce the bill.',
    category: 'tax',
    readMins: 6,
    calcPath: '/tax-planner',
    calcLabel: 'Plan your CGT in the Tax Planner',
    sections: [
      {
        heading: 'What is CGT?',
        body: `Capital Gains Tax (CGT) is not a separate tax in SA — it's levied through the income tax system. When you sell an asset for more than you paid, the gain is partly included in your taxable income and taxed at your marginal rate.

Assets subject to CGT: shares, unit trusts, ETFs (held outside a TFSA/RA), investment property, business assets, cryptocurrency, and most other capital assets.

Assets exempt from CGT: your primary residence (up to R2 million gain per person, R3 million per person for properties owned jointly or post 1 Oct 2001 base), personal use assets, payouts from life policies, and assets inside a TFSA or RA.`,
      },
      {
        heading: 'How CGT is calculated',
        body: `Step 1: Calculate the gross capital gain = proceeds minus base cost (what you paid, plus costs of acquisition and disposal).

Step 2: Subtract the annual exclusion: R40 000 for individuals (2025/26). This resets every year and cannot be carried forward.

Step 3: Apply the inclusion rate: 40% for individuals. So only 40% of the net gain is added to your taxable income.

Step 4: Tax that included amount at your marginal income tax rate.

Effective maximum CGT rate = 45% (top marginal rate) × 40% (inclusion) = 18% of the actual gain — much lower than the headline rate on ordinary income.`,
        tip: 'If your marginal rate is 26%, your effective CGT rate is just 10.4% of the actual gain.',
      },
      {
        heading: 'The primary residence exclusion',
        body: `If you sell your primary residence (the home you ordinarily live in), the first R2 million of the gain is excluded entirely. A couple who both qualify and jointly own the property can exclude up to R3 million of a combined gain (R2M for the first spouse, R1M for the second — the rules are complex, get professional advice for large gains).

If you've used part of your home to earn income (home office, Airbnb), a proportional part of the gain loses the exclusion.`,
      },
      {
        heading: 'Legal ways to minimise CGT',
        body: `• Use the TFSA: all growth inside a TFSA — including capital gains — is permanently exempt. This is the single most powerful CGT shelter for retail investors.
• Harvest losses: sell underwater positions before year-end to realise losses that offset gains, then buy back after 21+ days.
• Spread disposals across tax years: if you're selling a large position, sell part before 28 February (end of the tax year) and the rest in March — you get two annual exclusions.
• Hold long-term: CGT applies when you sell. The longer you hold, the longer you defer the tax event.
• Donations to spouses: assets can be transferred to a lower-income spouse at base cost (a rollover), deferring CGT and taxing the eventual gain at a lower rate.`,
        warn: 'Wash-sale rules (buying the same asset back immediately) are under increasing SARS scrutiny. Speak to a tax practitioner before aggressive loss-harvesting strategies.',
      },
    ],
  },
  {
    slug: 'two-pot-retirement',
    title: 'The 2-Pot Retirement System: What Changed on 1 September 2024',
    summary: 'SA\'s new retirement fund split — savings pot, retirement pot, and vested pot explained.',
    category: 'tax',
    readMins: 5,
    calcPath: '/ra-planner',
    calcLabel: 'Plan your RA contributions',
    sections: [
      {
        heading: 'What changed?',
        body: `On 1 September 2024 South Africa introduced the 2-Pot Retirement System, which restructures how all future contributions to RAs, pension funds, and provident funds are split:

• Savings Pot: one-third of each future contribution goes here. Accessible once per tax year (minimum withdrawal R2 000), taxed as income in the year of withdrawal.
• Retirement Pot: two-thirds of each future contribution. Locked until retirement — must be used to buy an annuity at retirement.
• Vested Pot: all money accumulated before 1 September 2024 stays in the vested pot under old rules. Pension/RA members: old rules apply (can't access before 55, full amount on withdrawal or two-thirds annuity at retirement). Provident fund members: old rules also preserved.`,
        tip: 'Seed capital: on 1 September 2024 a once-off transfer of 10% of your vested pot (capped at R30 000) was seeded into your savings pot.',
      },
      {
        heading: 'When to use the savings pot',
        body: `The savings pot is designed for genuine emergencies — not annual top-ups to your lifestyle. Every withdrawal is taxed as income (added to your other income for that year), so a R50 000 withdrawal while earning R600 000 could push you into the 36% bracket.

Use it only when: you face genuine financial distress with no cheaper alternative (emergency fund depleted, no access to credit at reasonable rates). Avoid it for: holidays, car upgrades, or anything you'd regret in retirement.`,
        warn: 'Each savings pot withdrawal resets your access. You can only withdraw once per tax year (1 March to 28 February), and the minimum is R2 000.',
      },
      {
        heading: 'Impact on resignation and retrenchment',
        body: `Under the old rules, resigning from a job triggered a full fund withdrawal (after punishing tax). Under 2-Pot:

• The savings pot can still be withdrawn (taxed as income).
• The retirement pot can no longer be accessed on resignation — it must stay invested and transfer to the new employer's fund or a preservation fund.

This is designed to prevent the long-standing SA habit of "cashing out" retirement savings every time you change jobs — which was the main reason many South Africans arrived at retirement with little saved.`,
      },
    ],
  },
  // ── PROPERTY ───────────────────────────────────────────────────────────────
  {
    slug: 'rental-yield-vs-capital-growth',
    title: 'Rental Yield vs Capital Growth: Which Property Strategy Wins?',
    summary: 'How to evaluate an investment property on more than just the asking price.',
    category: 'property',
    readMins: 6,
    calcPath: '/rental-yield',
    calcLabel: 'Calculate your rental yield',
    sections: [
      {
        heading: 'Two ways property makes money',
        body: `Investment property returns come from two sources:

1. Rental yield — the ongoing income from tenants as a percentage of the property's value.
2. Capital growth — the increase in the property's value over time.

These two sources often trade off against each other: high-yield properties (sectional title units in affordable areas) typically grow more slowly in value. Premium properties in sought-after suburbs may grow fast in value but yield poorly because prices have run ahead of rents.`,
      },
      {
        heading: 'Gross vs net yield',
        body: `Gross yield = annual rent ÷ purchase price × 100. Easy to calculate, but misleading.

Net yield strips out vacancy, management fees, rates, levies, insurance, and maintenance. A property grossing 8% might net only 5-5.5% after costs — which barely keeps pace with inflation.

As a rough guide for SA residential property:
• Below 6% gross: poor yield (you're betting heavily on capital growth)
• 6-8% gross: acceptable
• Above 8% gross: strong yield (typical in townships, affordable urban areas, student accommodation)`,
        tip: 'Use the net yield after all costs as your benchmark, not the gross figure landlords quote.',
      },
      {
        heading: 'What drives capital growth?',
        body: `JSE-listed property (REITs) and residential property have averaged 7-9% nominal capital growth p.a. over long periods, tracking nominal GDP growth roughly. But averages mask enormous variation:

• Location is everything: Cape Town Atlantic Seaboard properties grew 15%+ p.a. for most of the 2010s; inland commuter towns grew at 3-4%.
• Infrastructure and development pipelines matter more than current desirability.
• Properties below the median price in a suburb tend to outperform on capital growth (they "catch up" over time).`,
      },
      {
        heading: 'Which wins?',
        body: `There is no universal answer — it depends on your tax rate, bond rate, time horizon, and whether you need income now or at retirement.

Higher-yield property suits: investors in the 36-45% marginal bracket who benefit from interest and cost deductions (section 13sex for new builds is particularly powerful), investors who need regular cash flow.

Higher-growth property suits: younger investors with long horizons who can absorb negative cash flow in the early years, investors near the 18-26% bracket who don't need the income deductions as much.

A blended portfolio — some yield, some growth — is what most SA property planners recommend.`,
      },
    ],
  },
  {
    slug: 'bond-affordability',
    title: 'Bond Affordability in SA: The NCA 30% Rule and What Banks Actually Check',
    summary: 'How lenders assess whether you can afford a home loan, and how to maximise approval.',
    category: 'property',
    readMins: 5,
    calcPath: '/affordability',
    calcLabel: 'Check your bond affordability',
    sections: [
      {
        heading: 'The 30% rule',
        body: `South African banks historically applied a guideline that total debt repayments should not exceed 30% of gross monthly income. This is often called the NCA (National Credit Act) rule, though the NCA itself doesn't specify 30% — it's a convention banks adopted.

In practice, modern banks use a more nuanced DTI (Debt-to-Income) ratio that looks at all monthly obligations: existing car finance, personal loans, credit card minimum payments, and the proposed bond installment. The aggregate is usually expected to stay below 36-40% of gross income.`,
      },
      {
        heading: 'What banks actually look at',
        body: `• Gross monthly income — salary, commission, allowances, rental income (usually discounted by 25% for vacancy risk).
• Net disposable income — gross minus tax and existing deductions. Banks stress-test this against a rate 2-3% above prime.
• Credit score — a score below 600 makes approval very difficult; above 700 opens access to better rates.
• Deposit size — a 10% deposit is the common minimum, but 20%+ deposits result in significantly better rates and lower monthly payments.
• Employment history — banks want to see at least 3 months of continuous employment in the current role, or 2 years of self-employment with financials.`,
      },
      {
        heading: 'The initiation fee and bond registration costs',
        body: `When budgeting for a home purchase, remember costs beyond the purchase price:

• Transfer duty: a sliding-scale government tax on property transfers (zero for properties below R1 100 000 as of 2025/26).
• Bond registration costs: attorney fees to register the mortgage bond at the Deeds Office — roughly R20 000-R30 000 on a R1 million bond.
• Bank initiation fee: ~R6 037 (standard across most major SA banks as of 2025/26), often capitalised into the loan.
• Monthly service fee: R69/month (standard across most major banks).

Total cash needed at signing can easily exceed the deposit by R30 000-R60 000 for a first-time buyer.`,
        tip: 'Many buyers only budget for the deposit and are blindsided by transfer duty and bond registration. Budget an extra 3-5% of the purchase price for these costs.',
      },
    ],
  },
  // ── DEBT & BUDGETING ───────────────────────────────────────────────────────
  {
    slug: 'debt-snowball-vs-avalanche',
    title: 'Debt Snowball vs Debt Avalanche: Which Payoff Strategy is Right for You?',
    summary: 'Two proven methods for eliminating debt — and the psychology behind each.',
    category: 'debt',
    readMins: 5,
    calcPath: '/debt-snowball',
    calcLabel: 'Build your debt payoff plan',
    sections: [
      {
        heading: 'The debt snowball',
        body: `The snowball method (popularised by Dave Ramsey) involves listing all debts from smallest balance to largest, regardless of interest rate. You pay minimum payments on all debts, then throw any extra money at the smallest balance until it's gone. Repeat, rolling the payment into the next debt.

Why it works: each paid-off debt is a win. The psychological momentum — seeing debts disappear — keeps people motivated to stick with the plan long-term. Research (Harvard Business Review, 2016) shows that people are more likely to complete debt payoff when they track individual accounts rather than aggregate balances.`,
      },
      {
        heading: 'The debt avalanche',
        body: `The avalanche method prioritises the debt with the highest interest rate first, regardless of balance. Mathematically, this minimises total interest paid and gets you debt-free fastest.

Example: If you have R50 000 on a credit card at 22% and R20 000 on a car at 12%, the avalanche attacks the credit card first. The snowball would attack the car first (smaller balance).

Over a multi-year payoff plan, the avalanche typically saves thousands of rands in interest compared to the snowball.`,
        tip: 'If you have strong financial discipline and don\'t need the psychological wins, use the avalanche — it will cost you less in total interest.',
      },
      {
        heading: 'Which should you use?',
        body: `Neither method is universally superior. The best method is the one you stick to.

Choose the snowball if: you've tried budgets before and abandoned them, you have many small debts that feel overwhelming, or the psychological wins help you stay committed.

Choose the avalanche if: you're mathematically inclined, your debts are similar in size, or the highest-rate debt is also the smallest (making the methods converge).

A hybrid: list debts in avalanche order (by rate) but consider paying off any debt with a balance under R5 000 immediately, then continuing with the avalanche — you get a quick win without sacrificing much mathematically.`,
      },
      {
        heading: 'SA context: which debts to kill first',
        body: `Rank SA debts by urgency:

1. Store cards / clothing accounts (24-36% per annum) — extraordinarily expensive, eliminate first.
2. Credit cards (18-22% p.a.) — second priority.
3. Personal loans (15-20% p.a.).
4. Vehicle finance (11-14% p.a.) — expensive, but liquidating a depreciating asset is complex.
5. Home loan (prime-linked, currently ~11.5% p.a.) — lowest rate, often better to invest surplus rather than overpay if rates are at the low end.`,
        warn: 'Never miss a minimum payment while doing debt snowball/avalanche — the penalty fees and credit bureau listing cost far more than any optimisation gain.',
      },
    ],
  },
  {
    slug: '50-30-20-rule',
    title: 'The 50/30/20 Budget Rule — and How to Adapt It for SA Salaries',
    summary: 'A simple budgeting framework and how to make it work on a South African income.',
    category: 'debt',
    readMins: 4,
    calcPath: '/budget',
    calcLabel: 'Build your budget in the Budget Planner',
    sections: [
      {
        heading: 'What is the 50/30/20 rule?',
        body: `The 50/30/20 rule divides your after-tax income into three buckets:

• 50% Needs: rent/bond, groceries, utilities, transport, medical aid, minimum debt payments.
• 30% Wants: dining out, subscriptions, entertainment, clothing beyond necessities, hobbies.
• 20% Savings & investments: emergency fund, TFSA, RA, extra debt repayment.

Originally developed by US Senator Elizabeth Warren, the framework is widely used as a starting point for personal budgeting — not a rigid rule, but a useful diagnostic.`,
      },
      {
        heading: 'Why it needs adjustment for SA',
        body: `South Africa's cost structure differs significantly from the US:

• Housing costs in Cape Town and Johannesburg consume 30-40%+ of take-home pay for middle-income earners — already blowing the 50% cap just on one "need".
• Petrol and transport costs (many SA earners drive long distances; public transport is limited) are a much higher share of income than in the US.
• Private medical aid is essentially mandatory for quality healthcare, adding another R1 000-R3 000+/month.

A more realistic SA split for the R25 000-R50 000/month take-home bracket is 60% needs / 20% wants / 20% savings — and the goal should be to push the savings rate up as income grows, keeping wants flat.`,
      },
      {
        heading: 'Building your first budget',
        body: `1. Start with your net monthly income (after tax and deductions).
2. List all fixed obligations: rent/bond, car payment, medical aid, insurance, minimum debt payments.
3. List variable necessities: groceries, petrol, electricity, data.
4. Sum these: this is your "needs" number.
5. Whatever remains is the pool for wants and savings. If needs already exceed 70%, something needs to change: a fixed cost (bigger accommodation) or variable (grocery spend).

Most South Africans discover in this exercise that their "needs" have quietly expanded to consume 80%+ of income — driven by lifestyle creep as salary increased.`,
        tip: 'Track actual spending for one month before budgeting — most people are shocked by their true spending in discretionary categories.',
      },
    ],
  },
  {
    slug: 'emergency-fund',
    title: 'Why You Need an Emergency Fund and How to Size It',
    summary: 'The financial buffer that keeps a crisis from becoming a catastrophe.',
    category: 'debt',
    readMins: 4,
    calcPath: '/emergency-fund',
    calcLabel: 'Calculate your emergency fund target',
    sections: [
      {
        heading: 'What is an emergency fund?',
        body: `An emergency fund is a cash reserve — held in a liquid, low-risk account — sized to cover unexpected expenses or income loss without forcing you to take on debt or sell investments at a bad time.

Common emergencies it covers: retrenchment, car breakdown, medical costs not covered by aid, urgent home repairs, death in the family requiring travel.

What it is not: a savings account for planned purchases, an investment account, or a budget buffer for regular overspending.`,
      },
      {
        heading: 'How much do you need?',
        body: `The standard guidance is 3-6 months of essential living expenses. "Essential" means: rent/bond, food, utilities, transport, medical aid, insurance, and minimum debt payments — not discretionary spending.

Lean towards 6 months if: you're self-employed, work in a volatile industry, have dependants, or your fixed costs are high relative to your income.

3 months is reasonable if: you're a permanent employee with strong union protection, have few dependants, and have access to a backup credit line with a manageable interest rate.`,
        tip: 'In SA, where retrenchment payouts (1 week per year of service under the BCEA) can be modest and UIF caps out at R17 712/month, leaning toward 6 months is prudent for most earners.',
      },
      {
        heading: 'Where to keep it',
        body: `The emergency fund must be liquid (accessible within 1-2 business days) and safe (not subject to market volatility). Options:

• Money market account (e.g. Allan Gray Money Market, Stanlib Money Market): currently yielding 8-9% p.a. with same-day liquidity. The gold standard for SA emergency funds.
• 32-day notice account: slightly higher rate, but the 32-day notice period means it doesn't work for a true emergency unless you've already given notice.
• High-yield savings account: most banks offer competitive online savings accounts with instant access and rates near repo rate.

Avoid: equities, ETFs, or any account that can drop in value — the whole point is that the money is there when you need it, regardless of market conditions.`,
      },
    ],
  },
  // ── FIRE & MACRO ───────────────────────────────────────────────────────────
  {
    slug: 'fire-movement',
    title: 'FIRE in South Africa: Financial Independence, Retire Early — What You Need to Know',
    summary: 'How the FIRE movement translates to SA tax, healthcare, and rand depreciation realities.',
    category: 'fire',
    readMins: 6,
    calcPath: '/fire',
    calcLabel: 'Calculate your FIRE number',
    sections: [
      {
        heading: 'What is FIRE?',
        body: `FIRE (Financial Independence, Retire Early) is a movement built on one core mathematical insight: if you accumulate a portfolio worth 25× your annual expenses, you can live indefinitely off a 4% annual withdrawal — historically enough that the portfolio sustains itself through market downturns.

The "4% rule" (Bengen, 1994) was derived from US data (a 60/40 stock/bond portfolio). In a South African context with rand currency risk and higher inflation, most SA FIRE practitioners use a more conservative 3-3.5% withdrawal rate and hold significant offshore exposure.`,
      },
      {
        heading: 'The SA FIRE number',
        body: `Your FIRE number = annual expenses ÷ withdrawal rate.

If you can live on R30 000/month (R360 000/year) and target a 4% SWR:
FIRE number = R360 000 ÷ 0.04 = R9 million.

At 3.5% SWR (more conservative): R360 000 ÷ 0.035 = R10.3 million.

These amounts need to be expressed in real (inflation-adjusted) terms at the date of FIRE, not today's money. At 5.5% inflation over 20 years, R9 million today is R26 million in 20 years' time. This is why the retirement income calculator compounds your desired income to the future year before solving for contributions.`,
        tip: 'The rand has historically depreciated against major currencies. Holding 40-60% of your FIRE portfolio in offshore assets (USD, EUR) provides a natural rand-hedge.',
      },
      {
        heading: 'SA-specific FIRE challenges',
        body: `Medical aid: no universal healthcare means private medical aid remains essential after "retirement". A hospital plan for a couple runs R3 000-R6 000+/month, rising at medical inflation of ~10% p.a. — significantly faster than CPI. This alone can consume 10-15% of a modest FIRE budget.

Tax on withdrawals: if your portfolio is primarily inside an RA, two-thirds must be used to buy an annuity, and withdrawals are taxed as income. TFSA withdrawals are tax-free. Optimal SA FIRE sequencing is: TFSA first (tax-free), RA annuity second (taxable but structured to remain below the tax threshold).

Rand risk: a portfolio entirely in rand-denominated assets is exposed to currency depreciation. A weak rand boosts returns on offshore holdings — but a strengthening rand cuts them.`,
      },
      {
        heading: 'Lean FIRE, Fat FIRE, Barista FIRE',
        body: `FIRE isn't binary. Variants include:

• Lean FIRE: retire on the minimum viable amount. Works in SA with a low-cost-of-living location (smaller towns, rural areas) and no medical dependants.
• Fat FIRE: retire with a large buffer, maintaining a comfortable urban lifestyle with full medical cover.
• Barista FIRE: reach partial financial independence, then take low-stress part-time or passion work that covers daily expenses while your portfolio continues to compound. Very powerful — earning even R5 000/month reduces your portfolio drawdown significantly.`,
      },
    ],
  },
  {
    slug: 'prime-rate-explained',
    title: 'Prime Rate, Repo Rate, and What Rising Interest Rates Mean for Your Finances',
    summary: 'How the SARB\'s repo rate flows through to your bond, car, and savings account.',
    category: 'fire',
    readMins: 4,
    sections: [
      {
        heading: 'The repo rate and the SARB',
        body: `The repo rate (repurchase rate) is the interest rate at which the South African Reserve Bank (SARB) lends money to commercial banks. The SARB's Monetary Policy Committee (MPC) meets six times per year and decides whether to raise, cut, or hold the rate.

The SARB uses the repo rate as its primary tool to control inflation. When inflation rises above the 3-6% target band, the SARB raises the repo rate to cool borrowing and spending. When inflation falls or the economy needs stimulation, the rate is cut.`,
      },
      {
        heading: 'Prime rate = repo + 3.5%',
        body: `The prime lending rate is always exactly repo + 3.5 percentage points. This is a long-standing SA banking convention. When the repo rate is 7.75%, prime is 11.25%.

Most variable-rate loans in SA are priced at prime or prime minus a discount. Your bond might be at prime (11.25%), prime minus 1% (10.25%), or prime plus 1% (12.25%) depending on your credit profile and the bank's assessment.

Fixed-rate products (some personal loans, fixed-rate bonds) lock the rate for a defined period, insulating you from changes in the repo rate — but typically priced higher than the variable rate to compensate the lender for taking the rate risk.`,
      },
      {
        heading: 'How rate changes affect your finances',
        body: `A 0.25% rate hike on a R1.5 million bond over 20 years increases your monthly repayment by approximately R200. A 1% increase adds roughly R800/month. Over the life of the loan, a 1% higher rate costs around R200 000 in additional interest.

For savers: rising rates are good — money market and savings account yields follow the repo rate closely, typically settling at around prime minus 2% to minus 3%.

For borrowers: rising rates are bad for variable debt. If you're in a rising rate environment, pay down variable-rate debt aggressively and avoid taking on new floating-rate obligations.`,
        tip: 'If your bond is at prime and the rate drops 1%, redirect the resulting payment saving to your bond as a lump-sum — you\'ll shave years off your loan without feeling the impact on your cash flow.',
      },
    ],
  },
  {
    slug: 'inflation-and-real-returns',
    title: 'Inflation and Real Returns: Why Nominal Numbers Mislead',
    summary: 'How to think about the purchasing power of your money — and what truly beats inflation in SA.',
    category: 'fire',
    readMins: 4,
    calcPath: '/inflation',
    calcLabel: 'Measure inflation\'s impact with the Inflation Calculator',
    sections: [
      {
        heading: 'Nominal vs real returns',
        body: `A nominal return is the percentage gain before adjusting for inflation. A real return strips out inflation to show your actual gain in purchasing power.

If your money market account pays 8% and inflation is 5.5%, your real return is approximately 2.5% (more precisely: (1.08 / 1.055) - 1 = 2.37%). You're growing your wealth, but only by 2.37% per year in real terms.

If your bond charges 11.5% and inflation is 5.5%, the bank's real return on your mortgage is 5.7%. From your perspective, you're paying 11.5% nominal to borrow money that's being eroded at 5.5% — the real cost of your debt is lower than the nominal rate.`,
      },
      {
        heading: 'What actually beats inflation in SA?',
        body: `South African CPI has averaged 5-6% per annum over the last 20 years. Assets that have outperformed over long periods:

• JSE All Share: ~11-13% nominal p.a. (5-7% real)
• SA residential property: ~7-9% nominal p.a. (1.5-3.5% real)
• Offshore equities (in rand terms): 12-15% p.a. nominal including rand depreciation effects
• Government bonds (long): ~9-10% nominal p.a. (3-4% real)
• Money market / cash: ~7-8% nominal p.a. (1.5-2.5% real) — roughly inflation-matching, not inflation-beating

Cash loses purchasing power slowly but surely. Over 20 years at 2% real return, R1 million becomes R1.49 million in real terms. Over 20 years at 6% real, R1 million becomes R3.21 million.`,
        tip: 'Always ask for the real return, not the nominal one. A fund advertising 12% returns in a 6% inflation environment is delivering 6% real — versus a fund in Australia delivering 9% in a 2% environment (7% real). The Australian fund wins despite the lower headline number.',
      },
      {
        heading: 'Inflation-linked bonds (ILBs)',
        body: `South Africa issues inflation-linked government bonds (ILBs) where the principal adjusts with CPI and the coupon is paid on the adjusted principal. These guarantee a real return and provide genuine inflation protection.

ILBs are accessible via the NSX (Namibia Stock Exchange) and JSE, or through most unit trust platforms. They're particularly useful for retirees who need income that keeps pace with cost-of-living increases.`,
      },
    ],
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function getArticlesByCategory(cat: ArticleCategory): Article[] {
  return ARTICLES.filter((a) => a.category === cat);
}
