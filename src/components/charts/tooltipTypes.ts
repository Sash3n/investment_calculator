/** What Recharts passes to a custom tooltip's content component. */
export interface ChartTooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  fill?: string;
  dataKey?: string | number;
  payload?: { fill?: string; [key: string]: unknown };
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string | number;
}
