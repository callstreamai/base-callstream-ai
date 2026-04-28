'use client';
import * as React from 'react';
import { useAuth } from '@/context/AuthContext';

export type SavedFlow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
};

type Props = {
  onSelect: (flow: SavedFlow) => void;
  onSave?: (name: string, code: string) => void;
  currentCode?: string;
};

export function FlowSelector({ onSelect, onSave, currentCode }: Props) {
  const { user, supabase, supabaseReady, openAuth } = useAuth();
  const [flows, setFlows] = React.useState<SavedFlow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [saveName, setSaveName] = React.useState('');
  const [saveDesc, setSaveDesc] = React.useState('');
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!user || !supabase) return;
    setLoading(true);
    supabase.from('flows').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setFlows(data ?? []); setLoading(false); });
  }, [user, supabase]);

  React.useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!supabase) return;
    await supabase.from('flows').delete().eq('id', id);
    setFlows(prev => prev.filter(f => f.id !== id));
  }

  async function handleSave() {
    if (!user || !supabase || !currentCode?.trim() || !saveName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('flows')
      .insert({ user_id: user.id, name: saveName, code: currentCode, description: saveDesc || null })
      .select().single();
    if (!error && data) {
      setFlows(prev => [data as SavedFlow, ...prev]);
      if (onSave) onSave(saveName, currentCode);
    }
    setSaving(false); setSaveOpen(false); setSaveName(''); setSaveDesc('');
  }

  if (!supabaseReady) {
    return (
      <span className="text-[12px] text-ink-600 italic">
        Saved flows require Supabase — see README to configure.
      </span>
    );
  }

  if (!user) {
    return (
      <button type="button" onClick={() => openAuth('login')}
        className="text-[12.5px] text-accent hover:underline font-semibold">
        Log in to load saved flows
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative" ref={ref}>
        <button type="button" onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-full border border-ink-400 hover:border-ink-600 transition-colors">
          <span>{loading ? 'Loading…' : flows.length === 0 ? 'No saved flows' : 'Load saved flow'}</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && flows.length > 0 && (
          <div className="absolute left-0 top-9 w-72 bg-ink-200 border border-ink-400 rounded-2xl shadow-2xl z-30 overflow-hidden">
            <div className="py-1 max-h-64 overflow-y-auto">
              {flows.map(f => (
                <div key={f.id} className="flex items-start justify-between gap-2 px-4 py-2.5 hover:bg-ink-300 cursor-pointer group"
                  onClick={() => { onSelect(f); setOpen(false); }}>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold truncate">{f.name}</div>
                    {f.description && <div className="text-[11px] text-ink-600 truncate">{f.description}</div>}
                    <div className="text-[11px] text-ink-600">{new Date(f.created_at).toLocaleDateString()}</div>
                  </div>
                  <button type="button" onClick={e => handleDelete(f.id, e)}
                    className="text-ink-600 hover:text-danger text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {currentCode?.trim() && (
        <button type="button" onClick={() => setSaveOpen(o => !o)}
          className="text-[12.5px] text-accent hover:underline font-semibold">
          Save flow
        </button>
      )}

      {saveOpen && (
        <div className="w-full mt-1 bg-ink-200 border border-ink-400 rounded-2xl p-4 space-y-2">
          <div className="text-[13px] font-semibold mb-1">Save this flow</div>
          <input type="text" value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Flow name (required)"
            className="w-full bg-ink-50 border border-ink-400 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-accent/60" />
          <input type="text" value={saveDesc} onChange={e => setSaveDesc(e.target.value)} placeholder="Description (optional)"
            className="w-full bg-ink-50 border border-ink-400 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-accent/60" />
          <div className="flex gap-2">
            <button type="button" onClick={handleSave} disabled={saving || !saveName.trim()}
              className="px-4 py-1.5 rounded-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-[13px] font-bold transition-colors">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setSaveOpen(false)}
              className="px-4 py-1.5 rounded-full border border-ink-400 text-[13px] font-semibold">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
