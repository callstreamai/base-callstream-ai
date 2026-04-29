'use client';
export const dynamic = 'force-dynamic';
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Logo } from '@/components/Logo';
import { FlowSelector, type SavedFlow } from '@/components/FlowSelector';

type Attachment = { name: string; type: string; size: number; data: string };

const MAX_TOTAL_BYTES = 18 * 1024 * 1024;
const MAX_FILES = 6;

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => { const s = r.result as string; const i = s.indexOf(','); res(i >= 0 ? s.slice(i + 1) : s); };
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}
function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Diff view ────────────────────────────────────────────────────────────────
// Parses the ```changes block Claude emits.
// Lines starting with + = added, - = removed, space/none = context.
type DiffLine = { type: 'added' | 'removed' | 'unchanged'; text: string };

function parseChangesBlock(raw: string): DiffLine[] {
  return raw.split('\n').map(line => {
    if (line.startsWith('+')) return { type: 'added' as const, text: line.slice(1) };
    if (line.startsWith('-')) return { type: 'removed' as const, text: line.slice(1) };
    return { type: 'unchanged' as const, text: line.startsWith(' ') ? line.slice(1) : line };
  });
}

function DiffView({ changesRaw }: { changesRaw: string }) {
  const diff = React.useMemo(() => parseChangesBlock(changesRaw), [changesRaw]);
  const addedCount = diff.filter(d => d.type === 'added').length;
  const removedCount = diff.filter(d => d.type === 'removed').length;
  if (addedCount === 0 && removedCount === 0) return null;

  return (
    <div className="mt-5 rounded-2xl border border-ink-400/70 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-ink-200/60 border-b border-ink-400/70">
        <span className="font-semibold text-[13.5px]">Line changes</span>
        <span className="text-[12px] px-2 py-0.5 rounded-full bg-[rgba(0,186,124,0.15)] text-[#00ba7c] font-semibold">+{addedCount} added</span>
        <span className="text-[12px] px-2 py-0.5 rounded-full bg-[rgba(244,33,46,0.12)] text-[#f4212e] font-semibold">−{removedCount} removed</span>
      </div>
      <div className="overflow-x-auto bg-[#0a0a0a]">
        <table className="w-full border-collapse font-mono text-[12.5px] leading-5">
          <tbody>
            {diff.map((line, i) => {
              const bg = line.type === 'added' ? 'bg-[rgba(0,186,124,0.08)]' : line.type === 'removed' ? 'bg-[rgba(244,33,46,0.08)]' : '';
              const textColor = line.type === 'added' ? 'text-[#4ade80]' : line.type === 'removed' ? 'text-[#f87171]' : 'text-ink-600';
              const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' ';
              const prefixColor = line.type === 'added' ? 'text-[#00ba7c] font-bold select-none' : line.type === 'removed' ? 'text-[#f4212e] font-bold select-none' : 'text-ink-500 select-none';
              return (
                <tr key={i} className={bg}>
                  <td className={`w-6 pl-3 pr-2 py-0.5 ${prefixColor} shrink-0`}>{prefix}</td>
                  <td className={`pr-6 pl-1 py-0.5 whitespace-pre ${textColor} ${line.type === 'removed' ? 'line-through opacity-60' : ''}`}>
                    {line.text || ' '}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Fields ───────────────────────────────────────────────────────────────────
const FIELDS = [
  { key: 'problem', label: '1. Describe the problem', hint: 'What is going wrong with your voice AI agent?', placeholder: "e.g. The agent hangs up before saying goodbye, or loops infinitely without routing.", rows: 3 },
  { key: 'flow', label: '2. Current Based flow', hint: 'Paste your current flow here, or load a saved one below.', placeholder: 'loop:\n    res = talk("You are a helpful receptionist.", False)\n    until "caller wants to schedule":\n        say("Sure, let me help.")', rows: 9, mono: true },
  { key: 'example', label: '3. Example transcript / error', hint: 'Show an example of the error in transcript form.', placeholder: 'Caller: Can I book for Saturday?\nAgent: Sure, what time?\nCaller: 2pm.\n[call drops — no confirmation sent]', rows: 6, mono: true },
  { key: 'goal', label: '4. Goal', hint: 'What should the agent do instead?', placeholder: "Confirm the appointment, log it to our CRM, and say a friendly goodbye before hanging up.", rows: 3 },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DebuggingPage() {
  const [values, setValues] = React.useState({ problem: '', flow: '', example: '', goal: '' });
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [answer, setAnswer] = React.useState<string | null>(null);
  const [changesRaw, setChangesRaw] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const answerRef = React.useRef<HTMLDivElement>(null);

  const totalBytes = attachments.reduce((s, a) => s + a.size, 0);

  function update(k: string, v: string) { setValues(p => ({ ...p, [k]: v })); }
  function loadFlow(f: SavedFlow) { setValues(p => ({ ...p, flow: f.code })); }

  async function onFiles(list: FileList | null) {
    if (!list) return;
    const next = [...attachments]; let run = totalBytes;
    for (const f of Array.from(list)) {
      if (next.length >= MAX_FILES) { setError(`Max ${MAX_FILES} files.`); break; }
      if (run + f.size > MAX_TOTAL_BYTES) { setError(`Total exceeds ${fmtBytes(MAX_TOTAL_BYTES)}.`); break; }
      try { const data = await fileToBase64(f); next.push({ name: f.name, type: f.type, size: f.size, data }); run += f.size; }
      catch { setError(`Failed to read ${f.name}`); }
    }
    setAttachments(next);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault(); setError(null); setAnswer(null); setChangesRaw(null);
    if (!values.problem.trim() && !values.flow.trim() && !values.example.trim() && !values.goal.trim() && !attachments.length) {
      setError('Fill in at least one field or attach a file.'); return;
    }
    setLoading(true);
    try {
      const resp = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, attachments }) });
      const json = await resp.json();
      if (!resp.ok) setError(json.error || 'Something went wrong.');
      else {
        setAnswer(json.answer ?? '');
        setChangesRaw(json.changes ?? null);
        setTimeout(() => answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Network error.'); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-black">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-32 pt-6 sm:pt-10">
        <section className="mb-7">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-danger/10 border border-danger/30 text-danger text-[11.5px] font-semibold mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" /> Debugging
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Fix your <span className="text-accent">Based</span> agent.
          </h1>
          <p className="mt-2 text-sm sm:text-base text-ink-600 leading-relaxed">
            Describe the problem, paste your flow, and get a diagnosis and corrected code — no coding skills required.
          </p>
        </section>

        <form onSubmit={submit} className="space-y-4">
          {FIELDS.map(f => (
            <div key={f.key} className="rounded-2xl border border-ink-400/70 bg-ink-100/40 hover:bg-ink-100/70 focus-within:bg-ink-100/80 focus-within:border-accent/60 transition-colors">
              <label className="block px-4 sm:px-5 pt-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-[15px]">{f.label}</span>
                  <span className="text-[11px] text-ink-600">optional</span>
                </div>
                <span className="block text-[12.5px] text-ink-600 mt-0.5">{f.hint}</span>
                {f.key === 'flow' && (
                  <div className="mt-2"><FlowSelector onSelect={loadFlow} currentCode={values.flow} /></div>
                )}
              </label>
              <textarea
                value={values[f.key as keyof typeof values]}
                onChange={e => update(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={f.rows}
                className={`w-full bg-transparent px-4 sm:px-5 pb-4 pt-2 outline-none resize-y placeholder:text-ink-500 text-[15px] leading-relaxed ${(f as {mono?:boolean}).mono ? 'font-mono text-[13px]' : ''}`}
              />
            </div>
          ))}

          <div className="rounded-2xl border border-ink-400/70 bg-ink-100/40 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="font-semibold text-[15px]">Attachments</div>
                <div className="text-[12.5px] text-ink-600">Images, PDFs, .py or .based files. Up to {MAX_FILES} files, {fmtBytes(MAX_TOTAL_BYTES)} total.</div>
              </div>
              <button type="button" onClick={() => fileRef.current?.click()} className="px-3.5 py-1.5 rounded-full border border-ink-400 hover:border-ink-600 text-sm font-semibold transition-colors">Add files</button>
              <input ref={fileRef} type="file" multiple hidden onChange={e => onFiles(e.target.files)} />
            </div>
            {attachments.length > 0 && (
              <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((a, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-[13px] bg-ink-50 border border-ink-400 rounded-xl px-3 py-2">
                    <div className="min-w-0"><div className="truncate font-medium">{a.name}</div><div className="text-ink-600 text-[11.5px]">{a.type || 'unknown'} · {fmtBytes(a.size)}</div></div>
                    <button type="button" onClick={() => setAttachments(p => p.filter((_, j) => j !== i))} className="text-ink-600 hover:text-danger text-xs font-semibold">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-[13.5px]">{error}</div>}

          <div className="flex items-center justify-between gap-3 pt-1">
            <button type="button" onClick={() => { setValues({ problem: '', flow: '', example: '', goal: '' }); setAttachments([]); setAnswer(null); setChangesRaw(null); setError(null); }} className="text-sm text-ink-600 hover:text-ink-800 font-semibold">Clear all</button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent hover:bg-accent-hover disabled:opacity-60 text-white font-bold text-[15px] transition-colors shadow-lg shadow-accent/20">
              {loading ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Thinking…</> : 'Get fix'}
            </button>
          </div>
        </form>

        <section ref={answerRef} className="mt-8">
          {loading && (
            <div className="rounded-2xl border border-ink-400/70 bg-ink-100/40 p-5 space-y-3">
              {[1/3, 1, 11/12, 9/12].map((w, i) => <div key={i} className="shimmer h-3 rounded" style={{ width: `${w * 100}%` }} />)}
              <div className="shimmer h-24 rounded mt-2" />
            </div>
          )}
          {!loading && answer && (
            <div className="rounded-2xl border border-ink-400/70 bg-ink-100/60 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Logo size={20} /><span className="font-semibold">Diagnosis & fix</span></div>
                <button type="button" onClick={() => { navigator.clipboard.writeText(answer); setCopied(true); setTimeout(() => setCopied(false), 1400); }} className="text-xs font-semibold px-3 py-1 rounded-full border border-ink-400 hover:border-ink-600 transition-colors">
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="prose-base text-[14.5px] sm:text-[15px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
              </div>
              {changesRaw && <DiffView changesRaw={changesRaw} />}
            </div>
          )}
        </section>

        <footer className="mt-12 text-center text-[12px] text-ink-600">
          <div className="flex items-center justify-center gap-2 mb-1"><Logo size={16} /><span>Call Stream AI</span></div>
          <p>Base is the conversational language for Brainbase.</p>
        </footer>
      </div>
    </main>
  );
}
