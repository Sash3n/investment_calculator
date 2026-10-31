import { formatRand } from '../../utils/format';

export interface StatementLine {
  label: string;
  /** Rand amount. Subtractions are passed as positive numbers with kind 'less'. */
  value?: number;
  kind?: 'plus' | 'less';
  /** Pre-formatted value for non-rand lines (percentages, dates) */
  display?: string;
  note?: string;
}

export interface StatementSection {
  heading: string;
  lines: StatementLine[];
  subtotal?: StatementLine;
}

export interface StatementData {
  title: string;
  subtitle?: string;
  sections: StatementSection[];
  total: StatementLine;
  /** Sections shown below the total, such as yields, that are not part of the sum */
  after?: StatementSection[];
  footnote?: string;
}

/** Display string for a line: "R 8 500", "−R 708", or its own display text. */
export function lineValue(line: StatementLine): string {
  if (line.display !== undefined) return line.display;
  const v = line.value ?? 0;
  const amount = formatRand(Math.abs(v), 0);
  // 'less' lines are subtractions given as positive amounts; other lines carry their own sign
  const negative = line.kind === 'less' ? v > 0 : v < 0;
  return negative && amount !== formatRand(0, 0) ? `−${amount}` : amount;
}

const WIDTH = 56;

function row(label: string, value: string): string {
  const plainValue = value.replace(/ /g, ' ');
  const dots = Math.max(2, WIDTH - label.length - plainValue.length - 2);
  return `${label} ${'.'.repeat(dots)} ${plainValue}`;
}

/** Plain-text version of a statement, for copying into an email or a note. */
export function statementToText(data: StatementData): string {
  const out: string[] = [data.title.toUpperCase()];
  if (data.subtitle) out.push(data.subtitle);
  out.push('');
  for (const section of data.sections) {
    out.push(section.heading);
    for (const line of section.lines) out.push(row(`  ${line.label}`, lineValue(line)));
    if (section.subtotal) out.push(row(`  ${section.subtotal.label}`, lineValue(section.subtotal)));
    out.push('');
  }
  out.push('='.repeat(WIDTH));
  out.push(row(data.total.label, lineValue(data.total)));
  out.push('='.repeat(WIDTH));
  for (const section of data.after ?? []) {
    out.push('', section.heading);
    for (const line of section.lines) out.push(row(`  ${line.label}`, lineValue(line)));
  }
  if (data.footnote) out.push('', data.footnote);
  return out.join('\n');
}
