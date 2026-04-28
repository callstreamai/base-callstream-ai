'use client';
export const dynamic = 'force-dynamic';
import * as React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';

export default function AccountPage() {
  const { user, profile, supabase, refreshProfile, signOut, openAuth, loading } = useAuth();
  const [displayName, setDisplayName] = React.useState('');
  const [companyName, setCompanyName] = React.useState('');
  const [companyRole, setCompanyRole] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setCompanyName(profile.company_name ?? '');
      setCompanyRole(profile.company_role ?? '');
    }
  }, [profile]);

  if (loading) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-ink-400 border-t-accent animate-spin" />
    </main>
  );

  if (!user) return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <Logo size={40} animated />
      <h1 className="text-2xl font-bold">Sign in to access your account</h1>
      <button onClick={() => openAuth('login')}
        className="px-6 py-2.5 rounded-full bg-accent hover:bg-accent-hover text-white font-bold transition-colors">
        Log in
      </button>
    </main>
  );

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(''); setSaved(false);
    if (!supabase) { setError('Supabase not configured.'); setSaving(false); return; }
    const { error } = await supabase.from('profiles').upsert({
      id: user!.id, display_name: displayName || null,
      company_name: companyName || null, company_role: companyRole || null,
    });
    setSaving(false);
    if (error) setError(error.message);
    else { setSaved(true); await refreshProfile(); setTimeout(() => setSaved(false), 2000); }
  }

  return (
    <main className="min-h-screen bg-black">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 pb-32 pt-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-[18px] font-bold text-accent">
            {profile?.display_name?.slice(0, 2).toUpperCase() ?? user.email?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-lg">{profile?.display_name ?? user.email}</div>
            <div className="text-[13px] text-ink-600">{user.email}</div>
          </div>
        </div>

        <form onSubmit={save} className="space-y-5">
          <div className="rounded-2xl border border-ink-400/70 bg-ink-100/40 p-5 sm:p-6 space-y-4">
            <h2 className="font-bold text-[16px]">Profile</h2>

            {error && <div className="rounded-xl bg-danger/10 border border-danger/30 px-3 py-2 text-[13px]">{error}</div>}

            <div>
              <label className="block text-[12px] text-ink-600 mb-1">Full name</label>
              <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full bg-ink-50 border border-ink-400 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 transition-all" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] text-ink-600 mb-1">Company</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                  placeholder="Acme Inc."
                  className="w-full bg-ink-50 border border-ink-400 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 transition-all" />
              </div>
              <div>
                <label className="block text-[12px] text-ink-600 mb-1">Your role</label>
                <input type="text" value={companyRole} onChange={e => setCompanyRole(e.target.value)}
                  placeholder="Founder, PM, Engineer…"
                  className="w-full bg-ink-50 border border-ink-400 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-[12px] text-ink-600 mb-1">Email</label>
              <input type="email" value={user.email ?? ''} disabled
                className="w-full bg-ink-300/40 border border-ink-400 rounded-xl px-3 py-2.5 text-[14px] text-ink-600 cursor-not-allowed" />
              <p className="text-[11px] text-ink-600 mt-1">Email cannot be changed here. Contact support.</p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button type="submit" disabled={saving}
                className="px-5 py-2 rounded-full bg-accent hover:bg-accent-hover disabled:opacity-60 text-white font-bold text-[14px] transition-colors">
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
              </button>
            </div>
          </div>
        </form>

        {/* Danger zone */}
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-5 mt-6">
          <h2 className="font-bold text-[16px] text-danger mb-1">Sign out</h2>
          <p className="text-[13px] text-ink-600 mb-3">You&apos;ll need to log back in to access your saved flows.</p>
          <button onClick={signOut}
            className="px-4 py-1.5 rounded-full border border-danger/40 text-danger hover:bg-danger/10 text-[13px] font-semibold transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
