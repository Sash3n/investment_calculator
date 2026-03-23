import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/Layout/AppShell';
import { Home } from './pages/Home';
import { MortgageCalculator } from './pages/MortgageCalculator';
import { PropertyROI } from './pages/PropertyROI';
import { CarFinance } from './pages/CarFinance';
import { PaymentVsInvesting } from './pages/PaymentVsInvesting';
import { TaxPlanner } from './pages/TaxPlanner';
import { InvestmentStrategy } from './pages/InvestmentStrategy';

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/mortgage" element={<MortgageCalculator />} />
        <Route path="/property-roi" element={<PropertyROI />} />
        <Route path="/car-finance" element={<CarFinance />} />
        <Route path="/extra-vs-investing" element={<PaymentVsInvesting />} />
        <Route path="/tax-planner" element={<TaxPlanner />} />
        <Route path="/investment-strategy" element={<InvestmentStrategy />} />
      </Route>
    </Routes>
  );
}

export default App;
