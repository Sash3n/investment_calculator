import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/Layout/AppShell';
import { Home } from './pages/Home';
import { MortgageCalculator } from './pages/MortgageCalculator';
import { PropertyROI } from './pages/PropertyROI';
import { CarFinance } from './pages/CarFinance';
import { PaymentVsInvesting } from './pages/PaymentVsInvesting';
import { TaxPlanner } from './pages/TaxPlanner';
import { InvestmentStrategy } from './pages/InvestmentStrategy';
import { History } from './pages/History';
import { NotFound } from './pages/NotFound';
import { ErrorPage } from './pages/ErrorPage';
import { Compare } from './pages/Compare';
import { PortfolioSummary } from './pages/PortfolioSummary';
import { TaxProjections } from './pages/TaxProjections';
import { TfsaOptimizer } from './pages/TfsaOptimizer';
import { FireCalculator } from './pages/FireCalculator';
import { RaPlanner } from './pages/RaPlanner';

function App() {
  return (
    <Routes>
      <Route element={<AppShell />} errorElement={<ErrorPage />}>
        <Route path="/" element={<Home />} />
        <Route path="/mortgage" element={<MortgageCalculator />} />
        <Route path="/property-roi" element={<PropertyROI />} />
        <Route path="/car-finance" element={<CarFinance />} />
        <Route path="/extra-vs-investing" element={<PaymentVsInvesting />} />
        <Route path="/tax-planner" element={<TaxPlanner />} />
        <Route path="/investment-strategy" element={<InvestmentStrategy />} />
        <Route path="/history" element={<History />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/portfolio" element={<PortfolioSummary />} />
        <Route path="/tax-projections" element={<TaxProjections />} />
        <Route path="/tfsa" element={<TfsaOptimizer />} />
        <Route path="/fire" element={<FireCalculator />} />
        <Route path="/ra-planner" element={<RaPlanner />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
