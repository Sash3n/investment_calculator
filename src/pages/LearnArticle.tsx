import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, BookOpen, ChevronRight, AlertTriangle, Lightbulb } from 'lucide-react';
import { getArticle, getArticlesByCategory, CATEGORY_META } from '../data/learn';

export function LearnArticle() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticle(slug) : undefined;

  if (!article) return <Navigate to="/learn" replace />;

  const meta     = CATEGORY_META[article.category];
  const related  = getArticlesByCategory(article.category)
    .filter((a) => a.slug !== article.slug)
    .slice(0, 3);

  return (
    <motion.div
      className="pb-16 max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Back */}
      <Link
        to="/learn"
        className="inline-flex items-center gap-1.5 text-xs mb-6 transition-colors hover:opacity-70"
        style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
      >
        <ArrowLeft size={13} /> Back to Financial Education
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
            style={{ background: `${meta.color}18`, color: meta.color }}
          >
            {meta.emoji} {meta.label}
          </span>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            <Clock size={11} /> {article.readMins} min read
          </span>
        </div>

        <h1 className="text-2xl font-bold leading-snug mb-3" style={{ color: 'var(--color-text)' }}>
          {article.title}
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {article.summary}
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {article.sections.map((section, i) => (
          <div key={i}>
            {section.heading && (
              <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
                {section.heading}
              </h2>
            )}

            <div className="space-y-3">
              {section.body.split('\n\n').map((para, j) => (
                <p key={j} className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)', whiteSpace: 'pre-line' }}>
                  {para}
                </p>
              ))}
            </div>

            {section.tip && (
              <div
                className="flex items-start gap-3 mt-4 p-4 rounded-xl text-sm"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <Lightbulb size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#6366F1' }} />
                <span style={{ color: 'var(--color-text-muted)' }}>{section.tip}</span>
              </div>
            )}

            {section.warn && (
              <div
                className="flex items-start gap-3 mt-4 p-4 rounded-xl text-sm"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
              >
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
                <span style={{ color: 'var(--color-text-muted)' }}>{section.warn}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CTA */}
      {article.calcPath && (
        <div
          className="mt-10 p-5 rounded-2xl flex items-center justify-between gap-4 flex-wrap"
          style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}30` }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: `${meta.color}20` }}>
              <BookOpen size={16} style={{ color: meta.color }} />
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: meta.color }}>Put it into practice</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Use the calculator to model your own numbers.
              </p>
            </div>
          </div>
          <Link
            to={article.calcPath}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: meta.color, color: '#fff', textDecoration: 'none' }}
          >
            {article.calcLabel ?? 'Open calculator'} <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* Related articles */}
      {related.length > 0 && (
        <div className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-muted)' }}>
            More in {meta.label}
          </p>
          <div className="space-y-3">
            {related.map((rel) => (
              <Link
                key={rel.slug}
                to={`/learn/${rel.slug}`}
                className="flex items-center justify-between p-4 rounded-xl group transition-all"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', textDecoration: 'none' }}
              >
                <div>
                  <p
                    className="text-sm font-medium group-hover:text-indigo-400 transition-colors"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {rel.title}
                  </p>
                  <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                    <Clock size={10} /> {rel.readMins} min
                  </p>
                </div>
                <ChevronRight size={15} style={{ color: 'var(--color-text-muted)' }} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 pt-6 text-[11px] text-center" style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-subtle)' }}>
        FinCalc ZA educational content is for general information only and does not constitute financial, tax, or legal advice. Figures based on publicly available SARS and industry data — verify with a certified financial planner for your situation.
      </div>
    </motion.div>
  );
}
