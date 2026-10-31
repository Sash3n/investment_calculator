# Changelog

Notable changes to FinCalc ZA. Versions follow [semantic versioning](https://semver.org).

## 2.0.0 - 2026-10-31

A full redesign and a recheck of the calculations. **Some results differ from 1.x because the earlier figures were wrong.** Saved snapshots still load and recalculate with the corrected logic when you open them, but the summary line saved with an older snapshot keeps its old figure until you save it again.

### Added

- Home page rebuilt around a live bond calculator and guided journeys that carry values between calculators.
- Simple sentence view on the Mortgage calculator and a Versus view for paying off the bond or investing.
- Payslip-style statements for rental yield, mortgage, salary and tax.
- Result panels, assumptions drawers and input checks on every calculator.
- Dated SARB, CPI and tax year references on the pages that use them.
- A recovery screen when a page fails, and an automatic reload when a tab left open across a release asks for old files.
- The app version in the sidebar, a security policy and monthly dependency updates.

### Changed

- New paper and ink design in light and dark, with self-hosted Source Serif 4 and Source Sans 3 fonts.
- Layouts and contrast checked on all routes at 360 and 1280 px in both themes.
- Tax Projections and the Exit Planner no longer name a "best" year by comparing rand amounts from different years. On the Exit Planner you choose the sale year.

### Fixed: tax and limits

- Budget 2026 figures applied everywhere: TFSA R46,000, retirement deduction cap R430,000, CGT exclusions, medical credits.
- VAT registration thresholds are R2.3m and R120,000, up from R1m and R50,000. The "months until the threshold" estimate is replaced by the distance to the threshold.
- Investment Strategy tax years, RA cap and brackets now follow the selected year.
- Rental losses now reduce tax on other income in Tax Projections, Property Portfolio Tax and the Tax Planner. Section 20A ring-fencing is not modelled, and the assumptions say so.
- RA Planner: cash at retirement includes the savings pot, taxed under the retirement lump sum table.
- TFSA Optimizer: reinvested dividends count towards the base cost, which removes an overstated CGT bill and TFSA advantage.
- Salary: the medical credit note follows the selected year.

### Fixed: calculations

- Extra Payments vs Investing and Car: Extra vs Investing compare both routes on equal monthly spending. Investing used to win even at a 0% return.
- Car Finance: the optional balloon now carries interest, which raises the instalment and total interest whenever a balloon is set.
- Dividend Income: dividend growth no longer compounds on top of price growth. With the defaults, year-20 income falls from about R1m to R86k a year.
- Retrenchment: BCEA notice periods, the official UIF formula, credit days up to 365, and real tax on notice and leave pay.
- FIRE: the FIRE number follows inflation to the year it is reached, Coast FIRE tests growth from that age, and the label shows the chosen withdrawal rate.
- Airbnb vs Rental: ownership costs come off both strategies.
- Loan Comparison: interest excludes service fees, and transfer duty comes from the home price.
- Rental Yield: growth is an input, the projection allows for the bond paid down, and net yield is shown before the bond.
- Education Savings: warns past the TFSA limits.
- Municipal Rates: 2026/27 tariffs for Johannesburg and Cape Town from council schedules, including water steps that were less than half the real tariff. Rates in the rand for the other metros were moved closer to published figures and stay labelled as estimates, and estimates are no longer named the cheapest city.

### Security

- Patched Firebase, React Router, Vite, jsPDF and their dependencies. `npm audit --omit=dev` reports no known vulnerabilities at release.
- The prime rate route answers only GET and HEAD.
- Error details are hidden in production.
- CI runs the build, tests and lint on every pull request.
- Main is protected, with required checks.
