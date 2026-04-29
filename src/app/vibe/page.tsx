'use client';
export const dynamic = 'force-dynamic';
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Logo } from '@/components/Logo';
import { FlowSelector, type SavedFlow } from '@/components/FlowSelector';

// ─── Branded field icons ──────────────────────────────────────────────────────
function FieldIcon({ id }: { id: string }) {
  const base = 'w-[18px] h-[18px] shrink-0';
  const stroke = '#D560B2';
  const sw = '1.75';

  if (id === 'purpose') return (
    // Target / crosshair
    <svg className={base} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="7.5" stroke={stroke} strokeWidth={sw}/>
      <circle cx="10" cy="10" r="3.5" stroke={stroke} strokeWidth={sw}/>
      <line x1="10" y1="1" x2="10" y2="4.5" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
      <line x1="10" y1="15.5" x2="10" y2="19" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
      <line x1="1" y1="10" x2="4.5" y2="10" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
      <line x1="15.5" y1="10" x2="19" y2="10" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
    </svg>
  );

  if (id === 'agentName') return (
    // Agent / bot head
    <svg className={base} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="7" width="14" height="10" rx="3" stroke={stroke} strokeWidth={sw}/>
      <circle cx="7.5" cy="12" r="1.25" fill={stroke}/>
      <circle cx="12.5" cy="12" r="1.25" fill={stroke}/>
      <path d="M10 3 L10 7" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
      <circle cx="10" cy="2.5" r="1" fill={stroke}/>
      <path d="M3 10 L1.5 10" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
      <path d="M17 10 L18.5 10" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
    </svg>
  );

  if (id === 'rag') return (
    // Knowledge / document stack
    <svg className={base} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="5" width="12" height="13" rx="2" stroke={stroke} strokeWidth={sw}/>
      <path d="M7 2 L16 2 Q18 2 18 4 L18 15" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
      <line x1="7" y1="10" x2="13" y2="10" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
      <line x1="7" y1="13" x2="11" y2="13" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
    </svg>
  );

  if (id === 'prompts') return (
    // Shield with checkmark — "rules/guardrails"
    <svg className={base} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2 L17 5 L17 10 C17 14 13.5 17.5 10 18.5 C6.5 17.5 3 14 3 10 L3 5 Z"
        stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
      <path d="M7 10 L9 12 L13 8" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  if (id === 'functions') return (
    // API / integration nodes — three connected dots
    <svg className={base} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="4" cy="10" r="2.5" stroke={stroke} strokeWidth={sw}/>
      <circle cx="16" cy="5" r="2.5" stroke={stroke} strokeWidth={sw}/>
      <circle cx="16" cy="15" r="2.5" stroke={stroke} strokeWidth={sw}/>
      <path d="M6.5 10 C9 10, 10 5, 13.5 5" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
      <path d="M6.5 10 C9 10, 10 15, 13.5 15" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
    </svg>
  );

  return null;
}

const FIELDS = [
  {
    key: 'purpose', label: 'Purpose',
    hint: 'What does this agent do? Describe its job in plain English.',
    placeholder: 'e.g. A dental receptionist that schedules, reschedules, and cancels appointments. It should handle callers politely and transfer billing questions to a human.',
    rows: 4,
  },
  {
    key: 'agentName', label: 'Agent name',
    hint: 'What should the agent call itself?',
    placeholder: 'e.g. Alex, the Riverside Dental assistant',
    rows: 1,
  },
  {
    key: 'rag', label: 'RAG / Knowledge links',
    hint: 'Paste links to documents, URLs, or knowledge bases the agent should use as context (one per line).',
    placeholder: 'https://example.com/menu.pdf\nhttps://docs.acme.com/products\nhttps://notion.so/my-knowledge-base',
    rows: 4,
  },
  {
    key: 'prompts', label: 'Critical prompts',
    hint: 'Any must-follow rules, constraints, or persona instructions.',
    placeholder: 'Always verify the caller\'s name and phone before scheduling.\nNever discuss pricing — transfer to sales.\nBe warm but concise — maximum 2 sentences per response.',
    rows: 5,
  },
  {
    key: 'functions', label: 'Function calls / APIs / MCPs',
    hint: 'What external APIs, webhooks, or MCP tools should the agent call? Describe each one.',
    placeholder: 'POST https://api.acme.com/appointments — create appointment (fields: name, date, time, service)\nGET https://api.acme.com/availability — check open slots (params: date)\nSlack webhook: notify #bookings channel on new appointment',
    rows: 5,
  },
];

export default function VibePage() {
  const [values, setValues] = React.useState({
    purpose: '', agentName: '', rag: '', prompts: '', functions: '',
  });
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [savedMsg, setSavedMsg] = React.useState('');
  const resultRef = React.useRef<HTMLDivElement>(null);

  function update(k: string, v: string) { setValues(p => ({ ...p, [k]: v })); }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault(); setError(null); setResult(null);
    if (!values.purpose.trim() && !values.agentName.trim()) {
      setError('Fill in at least the Purpose or Agent name.'); return;
    }
    setLoading(true);
    try {
      const resp = await fetch('/api/vibe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await resp.json();
      if (!resp.ok) setError(json.error || 'Something went wrong.');
      else { setResult(json.code ?? ''); setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Network error.'); }
    finally { setLoading(false); }
  }

  function loadFlow(f: SavedFlow) {
    // When loading a saved flow into Vibe, put it in the result panel for editing
    setResult(f.code);
  }

  function copyCode() {
    const code = extractCode(result ?? '');
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); });
  }

  function extractCode(markdown: string): string {
    const m = markdown.match(/```(?:python)?\n([\s\S]*?)```/);
    return m ? m[1].trim() : markdown;
  }

  return (
    <main className="min-h-screen bg-black">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-32 pt-6 sm:pt-10">
        {/* Hero */}
        <section className="mb-7">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-[11.5px] font-semibold mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" /> Vibe
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Vibe-code your <span className="text-accent">Based</span> agent.
          </h1>
          <p className="mt-2 text-sm sm:text-base text-ink-600 leading-relaxed">
            Describe what you want in plain English. We&apos;ll generate a complete, production-ready Based flow for you — no coding required.
          </p>
        </section>

        <form onSubmit={submit} className="space-y-4">
          {FIELDS.map(f => (
            <div key={f.key} className="rounded-2xl border border-ink-400/70 bg-ink-100/40 hover:bg-ink-100/70 focus-within:bg-ink-100/80 focus-within:border-accent/60 transition-colors">
              <label className="block px-4 sm:px-5 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[15px] flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 shrink-0">
                      <FieldIcon id={f.key} />
                    </span>
                    {f.label}
                  </span>
                  {f.key !== 'purpose' && f.key !== 'agentName' && (
                    <span className="text-[11px] text-ink-600">optional</span>
                  )}
                </div>
                <span className="block text-[12.5px] text-ink-600 mt-0.5">{f.hint}</span>
              </label>
              <textarea
                value={values[f.key as keyof typeof values]}
                onChange={e => update(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={f.rows}
                className="w-full bg-transparent px-4 sm:px-5 pb-4 pt-2 outline-none resize-y placeholder:text-ink-500 text-[15px] leading-relaxed"
              />
            </div>
          ))}

          {/* Saved flows loader */}
          <div className="rounded-2xl border border-ink-400/70 bg-ink-100/40 p-4 sm:p-5">
            <div className="font-semibold text-[14px] mb-1">Saved flows</div>
            <p className="text-[12.5px] text-ink-600 mb-2">Load a previously saved flow to edit or use as a starting point.</p>
            <FlowSelector onSelect={loadFlow} currentCode={extractCode(result ?? '')} />
          </div>

          {error && <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-[13.5px]">{error}</div>}

          <div className="flex items-center justify-between gap-3 pt-1">
            <button type="button" onClick={() => { setValues({ purpose: '', agentName: '', rag: '', prompts: '', functions: '' }); setResult(null); setError(null); }}
              className="text-sm text-ink-600 hover:text-ink-800 font-semibold">Clear all</button>
            <button type="submit" disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent hover:bg-accent-hover disabled:opacity-60 text-white font-bold text-[15px] transition-colors shadow-lg shadow-accent/20">
              {loading
                ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Generating…</>
                : <>✨ Generate flow</>}
            </button>
          </div>
        </form>

        {/* Result */}
        <section ref={resultRef} className="mt-8">
          {loading && (
            <div className="rounded-2xl border border-ink-400/70 bg-ink-100/40 p-5 space-y-3">
              {[1/2, 1, 11/12, 4/5, 3/4].map((w, i) => <div key={i} className="shimmer h-3 rounded" style={{ width: `${w * 100}%` }} />)}
              <div className="shimmer h-48 rounded mt-2" />
            </div>
          )}
          {!loading && result && (
            <div className="rounded-2xl border border-ink-400/70 bg-ink-100/60 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Logo size={20} />
                  <span className="font-semibold">Generated Based flow</span>
                </div>
                <div className="flex items-center gap-2">
                  {savedMsg && <span className="text-[12px] text-success font-semibold">{savedMsg}</span>}
                  <button type="button" onClick={copyCode}
                    className="text-xs font-semibold px-3 py-1 rounded-full border border-ink-400 hover:border-ink-600 transition-colors">
                    {copied ? 'Copied' : 'Copy code'}
                  </button>
                </div>
              </div>

              {/* Save generated flow */}
              <div className="mb-4 pb-4 border-b border-ink-400">
                <FlowSelector
                  onSelect={f => setResult(f.code)}
                  currentCode={extractCode(result)}
                  onSave={name => setSavedMsg(`"${name}" saved!`)}
                />
              </div>

              <div className="prose-base text-[14.5px] sm:text-[15px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              </div>
            </div>
          )}
        </section>

        <footer className="mt-12 text-center text-[12px] text-ink-600">
          <div className="flex items-center justify-center gap-2 mb-1"><Logo size={16} /><span>Call Stream AI</span></div>
          <p>Based is the conversational language for Brainbase.</p>
        </footer>
      </div>
    </main>
  );
}
