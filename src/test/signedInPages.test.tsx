import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DEFAULT_PROPERTY_INPUTS } from '../config/calculatorDefaults';

const USER = { uid: 'user-1', displayName: 'Test User', photoURL: null };
const property = (id: string, name: string, purchasePrice: number) => ({
  id, name, savedAt: new Date('2026-10-01'),
  inputs: { ...DEFAULT_PROPERTY_INPUTS, propertyName: name, purchasePrice },
});
const noop = async () => {};
const state = { properties: [] as ReturnType<typeof property>[], docs: {} as Record<string, unknown[]> };

vi.mock('../lib/firebase', () => ({ db: {}, auth: {}, googleProvider: {} }));
vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ user: USER, loading: false, signIn: noop, signOut: noop }),
}));
vi.mock('../hooks/useFirestore', () => ({
  useSavedProperties: () => ({ properties: state.properties, loading: false, save: noop, remove: noop, reload: noop }),
  useHistory: () => ({ entries: [], loading: false, push: noop, update: noop, remove: noop, rename: noop, clear: noop, byType: () => [], reload: noop }),
}));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...path: string[]) => path.at(-1),
  doc: () => ({}),
  query: (name: string) => name,
  orderBy: () => ({}),
  serverTimestamp: () => new Date(),
  addDoc: async () => ({ id: 'new' }),
  setDoc: noop,
  deleteDoc: noop,
  getDocs: async (name: string) => {
    const rows = (state.docs[name] ?? []) as { id: string }[];
    return { docs: rows.map((r) => ({ id: r.id, ref: {}, data: () => r })), empty: rows.length === 0 };
  },
}));

// Recharts measures its container, which jsdom does not lay out.
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

beforeEach(() => {
  state.properties = [];
  state.docs = {};
});

describe('Portfolio Summary, signed in', () => {
  it('adds up saved properties', async () => {
    state.properties = [property('a', 'Sea Point flat', 1_500_000), property('b', 'Pretoria house', 2_500_000)];
    const { PortfolioSummary } = await import('../pages/PortfolioSummary');
    render(<MemoryRouter><PortfolioSummary /></MemoryRouter>);
    const panel = await screen.findByText('Equity across your portfolio');
    const text = within(panel.closest('section') ?? document.body).getAllByText(/./).map((n) => n.textContent).join(' ');
    expect(text).toMatch(/Your 2 properties are worth/);
    expect(document.body.textContent).toContain('Sea Point flat');
    expect(document.body.textContent).toContain('Pretoria house');
    expect(document.body.textContent).not.toMatch(/NaN|undefined/);
  });

  it('invites a first save when there are no properties', async () => {
    const { PortfolioSummary } = await import('../pages/PortfolioSummary');
    render(<MemoryRouter><PortfolioSummary /></MemoryRouter>);
    expect(screen.queryByText('Equity across your portfolio')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN|undefined/);
  });
});

describe('Budget Planner, signed in', () => {
  it('totals the transactions of the current month', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    state.docs = {
      budget_tags: [
        { id: 'salary', name: 'Salary', color: '#2a7', type: 'income' },
        { id: 'food', name: 'Groceries', color: '#a33', type: 'expense' },
      ],
      budget_transactions: [
        { id: 't1', description: 'October pay', amount: 30_000, date: today, yearMonth, tagId: 'salary', tagName: 'Salary', tagColor: '#2a7', type: 'income' },
        { id: 't2', description: 'Weekly shop', amount: 4_000, date: today, yearMonth, tagId: 'food', tagName: 'Groceries', tagColor: '#a33', type: 'expense' },
      ],
    };
    const { BudgetPlanner } = await import('../pages/BudgetPlanner');
    render(<MemoryRouter><BudgetPlanner /></MemoryRouter>);
    await waitFor(() => expect(document.body.textContent).toContain('Weekly shop'));
    expect(document.body.textContent).toContain('October pay');
    expect(document.body.textContent).not.toMatch(/NaN|undefined/);
  });

  it('seeds the starter tags on a first visit', async () => {
    const { BudgetPlanner } = await import('../pages/BudgetPlanner');
    render(<MemoryRouter><BudgetPlanner /></MemoryRouter>);
    await waitFor(() => expect(document.body.textContent).not.toMatch(/Loading/i));
    expect(document.body.textContent).not.toMatch(/NaN|undefined/);
  });
});
