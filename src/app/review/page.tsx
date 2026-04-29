'use client';
export const dynamic = 'force-dynamic';
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Logo } from '@/components/Logo';
import { FlowSelector, type SavedFlow } from '@/components/FlowSelector';

// ─── Grade badge ──────────────────────────────────────────────────────────────
function GradeBadge({ grade, score }: { grade: string; score: number }) {
  const letter = grade.charAt(0).toUpperCase();
  const color =
    letter === 'A' ? { ring: 'border-[#00ba7c]', bg: 'bg-[rgba(0,186,124,0.12)]', text: 'text-[#00ba7c]' } :
    letter === 'B' ? { ring: 'border-[#60a5fa]', bg: 'bg-[rgba(96,165,250,0.12)]', text: 'text-[#60a5fa]' } :
    letter === 'C' ? { ring: 'border-[#fbbf24]', bg: 'bg-[rgba(251,191,36,0.12)]', text: 'text-[#fbbf24]' } :
    letter === 'D' ? { ring: 'border-[#f97316]', bg: 'bg-[rgba(249,115,22,0.12)]', text: 'text-[#f97316]' } :
                     { ring: 'border-[#f4212e]', bg: 'bg-[rgba(244,33,46,0.12)]', text: 'text-[#f4212e]' };

  // Score bar width
  const bar = Math.max(0, Math.min(100, score));

  return (
    <div className={`flex items-center gap-5 p-5 rounded-2xl border ${color.ring} ${color.bg}`}>
      {/* Letter */}
      <div className={`w-16 h-16 rounded-xl border-2 ${color.ring} flex items-center justify-center shrink-0`}>
        <span className={`text-3xl font-black ${color.text}`}>{grade}</span>
      </div>
      {/* Score bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="font-bold text-[15px] text-ink-800">Overall score</span>
          <span className={`font-black text-[22px] ${color.text}`}>{score}<span className="text-[13px] font-semibold text-ink-600">/100</span></span>
        </div>
        <div className="h-2 rounded-full bg-ink-300/60 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${bar}%`, background: color.text.replace('text-[', '').replace(']', '') }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReviewPage() {
  const [flow, setFlow] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [review, setReview] = React.useState<string | null>(null);
  const [grade, setGrade] = React.useState<string | null>(null);
  const [score, setScore] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const resultRef = React.useRef<HTMLDivElement>(null);

  function loadFlow(f: SavedFlow) { setFlow(f.code); }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null); setReview(null); setGrade(null); setScore(null);
    if (!flow.trim()) { setError('Paste a Based flow to review.'); return; }
    setLoading(true);
    try {
      const resp = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow }),
      });
      const json = await resp.json();
      if (!resp.ok) { setError(json.error || 'Something went wrong.'); return; }
      setReview(json.review ?? '');
      setGrade(json.grade ?? null);
      setScore(typeof json.score === 'number' ? json.score : null);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-32 pt-6 sm:pt-10">

        {/* Hero */}
        <section className="mb-7">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(96,165,250,0.12)] border border-[rgba(96,165,250,0.3)] text-[#60a5fa] text-[11.5px] font-semibold mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" /> Review
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Review your <span className="text-accent">Based</span> flow.
          </h1>
          <p className="mt-2 text-sm sm:text-base text-ink-600 leading-relaxed">
            Paste any Based flow and get an instant grade, critical error check, and actionable improvement ideas.
          </p>
        </section>

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          {/* Flow input */}
          <div className="rounded-2xl border border-ink-400/70 bg-ink-100/40 hover:bg-ink-100/70 focus-within:bg-ink-100/80 focus-within:border-accent/60 transition-colors">
            <label className="block px-4 sm:px-5 pt-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-[15px]">Based flow</span>
                <span className="text-[11px] text-ink-600">{flow.length > 0 ? `${flow.length.toLocaleString()} chars` : 'paste your code'}</span>
              </div>
              <span className="block text-[12.5px] text-ink-600 mt-0.5">Paste the full Based flow you want reviewed.</span>
              <div className="mt-2">
                <FlowSelector onSelect={loadFlow} currentCode={flow} />
              </div>
            </label>
            <textarea
              value={flow}
              onChange={e => setFlow(e.target.value)}
              placeholder={"loop:\n    res = talk(\"You are a helpful receptionist.\", False)\n    until \"caller wants to schedule\":\n        say(\"Sure, let me help.\")"}
              rows={14}
              className="w-full bg-transparent px-4 sm:px-5 pb-4 pt-2 outline-none resize-y placeholder:text-ink-500 font-mono text-[13px] leading-relaxed"
            />
          </div>

          {error && <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-[13.5px]">{error}</div>}

          <div className="flex items-center justify-between gap-3 pt-1">
            <button type="button"
              onClick={() => { setFlow(''); setReview(null); setGrade(null); setScore(null); setError(null); }}
              className="text-sm text-ink-600 hover:text-ink-800 font-semibold">
              Clear
            </button>
            <button type="submit" disabled={loading || !flow.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-bold text-[15px] transition-colors shadow-lg shadow-accent/20">
              {loading
                ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Reviewing…</>
                : <>Review flow</>}
            </button>
          </div>
        </form>

        {/* Loading skeleton */}
        {loading && (
          <div className="mt-8 rounded-2xl border border-ink-400/70 bg-ink-100/40 p-5 space-y-3">
            <div className="shimmer h-16 rounded-xl" />
            <div className="shimmer h-3 rounded w-1/2 mt-4" />
            <div className="shimmer h-3 rounded w-full" />
            <div className="shimmer h-3 rounded w-11/12" />
            <div className="shimmer h-3 rounded w-full mt-3" />
            <div className="shimmer h-3 rounded w-4/5" />
          </div>
        )}

        {/* Results */}
        {!loading && review && (
          <section ref={resultRef} className="mt-8 space-y-4">

            {/* Grade card */}
            {grade && score !== null && (
              <GradeBadge grade={grade} score={score} />
            )}

            {/* Full review */}
            <div className="rounded-2xl border border-ink-400/70 bg-ink-100/60 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Logo size={20} />
                  <span className="font-semibold">Code review</span>
                </div>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(review); setCopied(true); setTimeout(() => setCopied(false), 1400); }}
                  className="text-xs font-semibold px-3 py-1 rounded-full border border-ink-400 hover:border-ink-600 transition-colors">
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="prose-base text-[14.5px] sm:text-[15px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{review}</ReactMarkdown>
              </div>
            </div>

          </section>
        )}

        <footer className="mt-12 text-center text-[12px] text-ink-600">
          <div className="flex items-center justify-center gap-2 mb-1"><Logo size={16} /><span>Call Stream AI</span></div>
          <p>Based is the conversational language for Brainbase.</p>
        </footer>
      </div>
    </main>
  );
}
