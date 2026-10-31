import { useId, useRef } from 'react';
import { X } from 'lucide-react';

/** Full disclaimer text, shown in a dialog from the footer and the header note. */
function DisclaimerText() {
  return (
    <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
      <p>
        FinCalc ZA gives general financial illustrations for educational purposes. Every result is an
        estimate and <strong style={{ color: 'var(--ink)' }}>is not financial, tax, investment or legal advice</strong>.
        Speak to a certified financial planner (CFP) or a SARS-registered tax practitioner before you make a
        financial decision.
      </p>
      <p>
        Tax figures come from publicly available SARS information and rates from the South African Reserve Bank
        and Stats SA. They may not reflect the latest changes, and your own circumstances can change the answer.
      </p>
      <p>
        <strong style={{ color: 'var(--ink)' }}>Your data:</strong> calculations run in your browser and are not
        sent anywhere by default. If you sign in with Google, saved properties and your last 50 calculations
        (which may include figures you enter, such as incomes and property values) are stored in your private
        cloud account until you delete them. You can remove them at any time from Calculation History and your
        portfolio. FinCalc ZA runs no analytics or tracking scripts.
      </p>
    </div>
  );
}

/** A button that opens the full disclaimer in a modal dialog. */
export function DisclaimerLink({ children = 'Full disclaimer', className }: { children?: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  // Each link has its own dialog, so the title id must be unique on the page
  const titleId = useId();
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className={className ?? 'underline underline-offset-2 hover:text-ink'}
      >
        {children}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className="disclaimer-dialog"
        onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 id={titleId} className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              Disclaimer
            </h2>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="p-1 rounded-lg hover:bg-paper-sunk"
              aria-label="Close disclaimer"
            >
              <X size={16} style={{ color: 'var(--ink-muted)' }} />
            </button>
          </div>
          <DisclaimerText />
        </div>
      </dialog>
    </>
  );
}

/** Slim, permanent note at the foot of every page. */
export function DisclaimerFooter() {
  return (
    <footer
      className="px-5 py-4 text-xs text-center border-t border-rule"
      style={{ color: 'var(--ink-subtle)', fontFamily: 'var(--font-text)' }}
    >
      Estimates only, not financial advice. Rates and tax figures can change.{' '}
      <DisclaimerLink />
    </footer>
  );
}
