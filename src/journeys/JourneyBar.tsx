import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';
import { JOURNEY_BY_ID, journeyHref } from '../config/journeys';
import { encodeState } from '../utils/share';
import { usePublishedJourneyValues } from './journeyContext';

/**
 * Shown above a calculator opened from a journey: the question, the steps, and
 * a button to the next step that carries this calculator's figures across.
 */
export function JourneyBar() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const values = usePublishedJourneyValues();

  const journey = JOURNEY_BY_ID[new URLSearchParams(search).get('journey') ?? ''];
  const index = journey ? journey.steps.findIndex((s) => s.path === pathname) : -1;
  if (!journey || index < 0) return null;

  const next = journey.steps[index + 1];
  const goNext = () => {
    if (!next) return;
    const build = journey.handoff?.[pathname];
    const handoff = build && values ? build(values) : {};
    navigate(journeyHref(journey.id, next.path, handoff.share ? encodeState(handoff.share) : undefined), {
      state: handoff.state,
    });
  };

  return (
    <nav
      aria-label={`Journey: ${journey.question}`}
      className="border-b border-rule bg-paper-raised px-5 py-3"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-2">
        <span aria-hidden className="w-1 h-5 rounded-full" style={{ background: journey.color }} />
        <p className="text-sm font-semibold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
          {journey.question}
        </p>
        <ol className="flex flex-wrap items-center gap-1.5 text-xs">
          {journey.steps.map((step, i) => (
            <li key={step.path} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden className="text-ink-subtle">›</span>}
              {i === index ? (
                <span aria-current="step" className="px-2 py-0.5 rounded-full bg-ink text-paper font-medium">
                  {i + 1}. {step.title}
                </span>
              ) : (
                <Link to={journeyHref(journey.id, step.path)} className="px-2 py-0.5 rounded-full text-ink-muted hover:text-ink">
                  {i + 1}. {step.title}
                </Link>
              )}
            </li>
          ))}
        </ol>
        <div className="ml-auto flex items-center gap-2">
          {next ? (
            <button type="button" onClick={goNext} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
              Next: {next.title}
              <ArrowRight size={13} aria-hidden />
            </button>
          ) : (
            <Link to="/#journeys" className="btn-ghost text-xs py-1.5 px-3">Back to the questions</Link>
          )}
          <Link to={pathname} className="p-1.5 rounded-lg text-ink-subtle hover:text-ink hover:bg-paper-sunk" aria-label="Leave this journey">
            <X size={14} aria-hidden />
          </Link>
        </div>
      </div>
      {next && journey.handoff?.[pathname] && (
        <p className="max-w-7xl mx-auto text-xs text-ink-subtle mt-1.5">
          Your figures from this step carry over to {next.title.toLowerCase()}: {next.why.toLowerCase()}.
        </p>
      )}
    </nav>
  );
}
