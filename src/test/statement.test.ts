import { describe, it, expect } from 'vitest';
import { lineValue, statementToText, type StatementData } from '../components/statement/statementText';

const nb = (s: string) => s.replace(/ /g, ' ');

describe('lineValue', () => {
  it('formats rand amounts, with a minus for subtractions', () => {
    expect(lineValue({ label: 'Rent', value: 8_500 })).toBe(nb('R 8 500'));
    expect(lineValue({ label: 'Levy', value: 1_800, kind: 'less' })).toBe(`−${nb('R 1 800')}`);
  });

  it('shows a negative total with a minus and zero without one', () => {
    expect(lineValue({ label: 'Cash flow', value: -1_234.4 })).toBe(`−${nb('R 1 234')}`);
    expect(lineValue({ label: 'Cash flow', value: -0.2 })).toBe(nb('R 0'));
    expect(lineValue({ label: 'Levy', value: 0, kind: 'less' })).toBe(nb('R 0'));
  });

  it('uses a pre-formatted display when given', () => {
    expect(lineValue({ label: 'Gross yield', display: '8.50%' })).toBe('8.50%');
  });
});

describe('statementToText', () => {
  const data: StatementData = {
    title: 'Monthly rental statement',
    sections: [
      { heading: 'Income', lines: [{ label: 'Rent', value: 8_500 }], subtotal: { label: 'Rent received', value: 8_500 } },
      { heading: 'Costs', lines: [{ label: 'Levy', value: 1_800, kind: 'less' }] },
    ],
    total: { label: 'Monthly cash flow', value: 6_700 },
    after: [{ heading: 'Returns', lines: [{ label: 'Gross yield', display: '8.50%' }] }],
    footnote: 'Estimate only.',
  };
  const text = statementToText(data);

  it('lines up every row to the same width with dot leaders', () => {
    const rows = text.split('\n').filter((l) => l.includes(' .'));
    expect(rows.length).toBe(5);
    expect(new Set(rows.map((r) => r.length)).size).toBe(1);
  });

  it('includes the title, total, after-sections and footnote in order', () => {
    const titleAt = text.indexOf('MONTHLY RENTAL STATEMENT');
    const totalAt = text.indexOf('Monthly cash flow');
    const returnsAt = text.indexOf('Returns');
    expect(titleAt).toBe(0);
    expect(totalAt).toBeGreaterThan(text.indexOf('Levy'));
    expect(returnsAt).toBeGreaterThan(totalAt);
    expect(text.trim().endsWith('Estimate only.')).toBe(true);
  });

  it('uses plain spaces so it pastes cleanly', () => {
    expect(text).not.toContain(' ');
  });
});
