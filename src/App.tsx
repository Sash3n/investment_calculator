import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppShell } from './components/Layout/AppShell';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { ErrorPage } from './pages/ErrorPage';

// ── Lazy-loaded calculator pages (route-based code splitting) ────────────────
// Pages use named exports, so each import is mapped to a default export for lazy().
const MortgageCalculator = lazy(() => import('./pages/MortgageCalculator').then((m) => ({ default: m.MortgageCalculator })));
const PropertyROI = lazy(() => import('./pages/PropertyROI').then((m) => ({ default: m.PropertyROI })));
const CarFinance = lazy(() => import('./pages/CarFinance').then((m) => ({ default: m.CarFinance })));
const CarExtraVsInvesting = lazy(() => import('./pages/CarExtraVsInvesting').then((m) => ({ default: m.CarExtraVsInvesting })));
const PaymentVsInvesting = lazy(() => import('./pages/PaymentVsInvesting').then((m) => ({ default: m.PaymentVsInvesting })));
const TaxPlanner = lazy(() => import('./pages/TaxPlanner').then((m) => ({ default: m.TaxPlanner })));
const InvestmentStrategy = lazy(() => import('./pages/InvestmentStrategy').then((m) => ({ default: m.InvestmentStrategy })));
const History = lazy(() => import('./pages/History').then((m) => ({ default: m.History })));
const Compare = lazy(() => import('./pages/Compare').then((m) => ({ default: m.Compare })));
const PortfolioSummary = lazy(() => import('./pages/PortfolioSummary').then((m) => ({ default: m.PortfolioSummary })));
const StressTest = lazy(() => import('./pages/StressTest').then((m) => ({ default: m.StressTest })));
const Affordability = lazy(() => import('./pages/Affordability').then((m) => ({ default: m.Affordability })));
const AirbnbVsRental = lazy(() => import('./pages/AirbnbVsRental').then((m) => ({ default: m.AirbnbVsRental })));
const ExitPlanner = lazy(() => import('./pages/ExitPlanner').then((m) => ({ default: m.ExitPlanner })));
const TaxProjections = lazy(() => import('./pages/TaxProjections').then((m) => ({ default: m.TaxProjections })));
const TfsaOptimizer = lazy(() => import('./pages/TfsaOptimizer').then((m) => ({ default: m.TfsaOptimizer })));
const FireCalculator = lazy(() => import('./pages/FireCalculator').then((m) => ({ default: m.FireCalculator })));
const RaPlanner = lazy(() => import('./pages/RaPlanner').then((m) => ({ default: m.RaPlanner })));
const BuyVsRent = lazy(() => import('./pages/BuyVsRent').then((m) => ({ default: m.BuyVsRent })));
const LoanComparison = lazy(() => import('./pages/LoanComparison').then((m) => ({ default: m.LoanComparison })));
const NetWorthDashboard = lazy(() => import('./pages/NetWorthDashboard').then((m) => ({ default: m.NetWorthDashboard })));
const RentalYieldFinder = lazy(() => import('./pages/RentalYieldFinder').then((m) => ({ default: m.RentalYieldFinder })));
const SalaryCalculator = lazy(() => import('./pages/SalaryCalculator').then((m) => ({ default: m.SalaryCalculator })));
const BudgetPlanner = lazy(() => import('./pages/BudgetPlanner').then((m) => ({ default: m.BudgetPlanner })));
const DebtSnowball = lazy(() => import('./pages/DebtSnowball').then((m) => ({ default: m.DebtSnowball })));
const EmergencyFund = lazy(() => import('./pages/EmergencyFund').then((m) => ({ default: m.EmergencyFund })));
const InflationCalc = lazy(() => import('./pages/InflationCalc').then((m) => ({ default: m.InflationCalc })));
const EducationSavings = lazy(() => import('./pages/EducationSavings').then((m) => ({ default: m.EducationSavings })));
const DividendCalculator  = lazy(() => import('./pages/DividendCalculator').then((m) => ({ default: m.DividendCalculator })));
const WealthTargetPlanner = lazy(() => import('./pages/WealthTargetPlanner').then((m) => ({ default: m.WealthTargetPlanner })));
const BondExtra           = lazy(() => import('./pages/BondExtra').then((m) => ({ default: m.BondExtra })));
const ProvisionalTax      = lazy(() => import('./pages/ProvisionalTax').then((m) => ({ default: m.ProvisionalTax })));
const RetrenchmentCalc    = lazy(() => import('./pages/RetrenchmentCalc').then((m) => ({ default: m.RetrenchmentCalc })));
const OffshoreAllowance   = lazy(() => import('./pages/OffshoreAllowance').then((m) => ({ default: m.OffshoreAllowance })));
const VatCalculator       = lazy(() => import('./pages/VatCalculator').then((m) => ({ default: m.VatCalculator })));

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-32" role="status" aria-label="Loading">
      <div
        className="w-8 h-8 rounded-full animate-spin"
        style={{ border: '3px solid var(--color-border)', borderTopColor: '#6366F1' }}
      />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<AppShell />} errorElement={<ErrorPage />}>
        <Route path="/" element={<Home />} />
        <Route
          path="*"
          element={
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/mortgage" element={<MortgageCalculator />} />
                <Route path="/property-roi" element={<PropertyROI />} />
                <Route path="/car-finance" element={<CarFinance />} />
                <Route path="/car-extra-vs-investing" element={<CarExtraVsInvesting />} />
                <Route path="/extra-vs-investing" element={<PaymentVsInvesting />} />
                <Route path="/tax-planner" element={<TaxPlanner />} />
                <Route path="/investment-strategy" element={<InvestmentStrategy />} />
                <Route path="/history" element={<History />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/portfolio" element={<PortfolioSummary />} />
                <Route path="/stress-test" element={<StressTest />} />
                <Route path="/affordability" element={<Affordability />} />
                <Route path="/airbnb-vs-rental" element={<AirbnbVsRental />} />
                <Route path="/exit-planner" element={<ExitPlanner />} />
                <Route path="/tax-projections" element={<TaxProjections />} />
                <Route path="/tfsa" element={<TfsaOptimizer />} />
                <Route path="/fire" element={<FireCalculator />} />
                <Route path="/ra-planner" element={<RaPlanner />} />
                <Route path="/buy-vs-rent" element={<BuyVsRent />} />
                <Route path="/loan-comparison" element={<LoanComparison />} />
                <Route path="/net-worth" element={<NetWorthDashboard />} />
                <Route path="/rental-yield" element={<RentalYieldFinder />} />
                <Route path="/salary" element={<SalaryCalculator />} />
                <Route path="/budget" element={<BudgetPlanner />} />
                <Route path="/debt-snowball" element={<DebtSnowball />} />
                <Route path="/emergency-fund" element={<EmergencyFund />} />
                <Route path="/inflation" element={<InflationCalc />} />
                <Route path="/education-savings" element={<EducationSavings />} />
                <Route path="/dividend-calculator"  element={<DividendCalculator />} />
                <Route path="/wealth-target"       element={<WealthTargetPlanner />} />
                <Route path="/bond-extra"          element={<BondExtra />} />
                <Route path="/provisional-tax"     element={<ProvisionalTax />} />
                <Route path="/retrenchment"        element={<RetrenchmentCalc />} />
                <Route path="/offshore-allowance"  element={<OffshoreAllowance />} />
                <Route path="/vat"                 element={<VatCalculator />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
