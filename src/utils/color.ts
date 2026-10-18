/**
 * Mix a colour with transparency. Works with token references such as
 * 'var(--note-blue)', which plain hex-alpha suffixes cannot do.
 *   alpha('var(--gain)', 12) -> 'color-mix(in srgb, var(--gain) 12%, transparent)'
 */
export function alpha(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

/**
 * Chart series colours in their fixed order. The order keeps neighbouring
 * series distinguishable for colour-blind readers in both themes, so assign
 * them in sequence and never reorder or cycle them.
 */
export const SERIES = [
  'var(--note-blue)',
  'var(--note-orange)',
  'var(--note-green)',
  'var(--note-brown)',
  'var(--note-teal)',
  'var(--note-red)',
] as const;

/** Five colours that stay distinct all the way round a pie (any rotation works). */
export const RING_OF_FIVE = [
  'var(--note-blue)',
  'var(--note-orange)',
  'var(--note-teal)',
  'var(--note-brown)',
  'var(--note-green)',
] as const;

/**
 * Colours for n categories, fixed by category position (not by value rank).
 * A five-slice pie closes the circle, so it uses RING_OF_FIVE. Past six,
 * categories fall back to neutrals; charts with that many slices should fold
 * the smallest into "Other".
 */
export function seriesColors(n: number): string[] {
  if (n === 5) return [...RING_OF_FIVE];
  return Array.from({ length: n }, (_, i) =>
    i < SERIES.length ? SERIES[i] : i === SERIES.length ? 'var(--ink-subtle)' : 'var(--ink-muted)',
  );
}

/** Hex values from the previous palette, as stored in saved user data. */
const LEGACY_HEX: Record<string, string> = {
  '#6366F1': 'var(--note-blue)', '#818CF8': 'var(--note-blue)', '#3B82F6': 'var(--note-blue)',
  '#10B981': 'var(--note-green)', '#34D399': 'var(--note-green)', '#22C55E': 'var(--note-green)',
  '#F59E0B': 'var(--note-orange)', '#F97316': 'var(--note-orange)', '#EAB308': 'var(--warn)',
  '#EF4444': 'var(--note-red)', '#EC4899': 'var(--note-red)',
  '#06B6D4': 'var(--note-teal)', '#14B8A6': 'var(--note-teal)',
  '#8B5CF6': 'var(--note-brown)', '#A855F7': 'var(--note-brown)', '#D946EF': 'var(--note-brown)',
  '#64748B': 'var(--ink-subtle)', '#94A3B8': 'var(--ink-muted)',
};

/** Map a colour saved under the old palette to its token; other values pass through. */
export function tokenColor(color: string): string {
  return LEGACY_HEX[color.toUpperCase()] ?? color;
}
