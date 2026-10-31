/** Event the command palette listens for, so a page can open it. */
export const OPEN_PALETTE_EVENT = 'fincalc:open-palette';

/** Open the calculator search from anywhere on the page. */
export function openCommandPalette(): void {
  window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
}
