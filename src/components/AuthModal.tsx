'use client';
import * as React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from './Logo';

export function AuthModal() {
  const { supabase, supabaseReady, authOpen, authMode, closeAuth, refreshProfile } = useAuth();
  const [mode, setMode] = React.useState<'login' | 'signup' | 'forgot'>(authMode);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [companyName, setCompanyName] = React.useState('');
  const [companyRole, setCompanyRole] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  React.useEffect(() => { setMode(authMode); }, [authMode]);
  React.useEffect(() => { if (authOpen) { setError(''); setSuccess(''); } }, [authOpen]);

  if (!authOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!supabase) { setError('Authentication is not configured yet. Add Supabase keys to enable accounts.'); return; }
    setLoading(true);
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/account?reset=1`,
        });
        if (error) throw error;
        setSuccess('Check your email for a reset link.');
        setLoading(false); return;
      }
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        closeAuth();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            display_name: displayName || null,
            company_name: companyName || null,
            company_role: companyRole || null,
          });
          await refreshProfile();
        }
        setSuccess('Account created! Check your email to confirm, then log in.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  const titles = { login: 'Log in', signup: 'Create account', forgot: 'Reset password' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeAuth} />
      <div className="relative w-full max-w-md bg-ink-100 border border-ink-400 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-ink-400 flex items-center gap-3">
          <Logo size={24} />
          <h2 className="font-bold text-lg">{titles[mode]}</h2>
          <button onClick={closeAuth} className="ml-auto text-ink-600 hover:text-ink-800 text-xl font-light">✕</button>
        </div>

        {!supabaseReady ? (
          <div className="px-6 py-8 text-center space-y-3">
            <div className="text-[14px] text-ink-600">Accounts require Supabase to be configured.</div>
            <div className="text-[12px] text-ink-600">See the README for setup instructions, then add your <code className="bg-ink-300 px-1 py-0.5 rounded text-[11px]">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="bg-ink-300 px-1 py-0.5 rounded text-[11px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> env vars.</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
            {error && <div className="rounded-xl bg-danger/10 border border-danger/30 px-3 py-2 text-[13px]">{error}</div>}
            {success && <div className="rounded-xl bg-success/10 border border-success/30 px-3 py-2 text-[13px] text-success">{success}</div>}

            <div>
              <label className="block text-[12px] text-ink-600 mb-1">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
                className="w-full bg-ink-50 border border-ink-400 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 transition-all" />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-[12px] text-ink-600 mb-1">Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="8+ characters"
                  className="w-full bg-ink-50 border border-ink-400 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 transition-all" />
              </div>
            )}

            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-[12px] text-ink-600 mb-1">Full name</label>
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Jane Smith"
                    className="w-full bg-ink-50 border border-ink-400 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] text-ink-600 mb-1">Company</label>
                    <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Inc."
                      className="w-full bg-ink-50 border border-ink-400 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[12px] text-ink-600 mb-1">Your role</label>
                    <input type="text" value={companyRole} onChange={e => setCompanyRole(e.target.value)} placeholder="Founder, PM…"
                      className="w-full bg-ink-50 border border-ink-400 rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 transition-all" />
                  </div>
                </div>
              </>
            )}

            {mode === 'login' && (
              <div className="text-right">
                <button type="button" onClick={() => setMode('forgot')} className="text-[12px] text-accent hover:underline">Forgot password?</button>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-full bg-accent hover:bg-accent-hover disabled:opacity-60 text-white font-bold text-[15px] transition-colors mt-1">
              {loading ? 'Please wait…' : titles[mode]}
            </button>

            {mode !== 'forgot' && (
              <p className="text-center text-[13px] text-ink-600">
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}
                  className="text-accent hover:underline font-semibold">
                  {mode === 'login' ? 'Sign up' : 'Log in'}
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <p className="text-center text-[13px] text-ink-600">
                <button type="button" onClick={() => setMode('login')} className="text-accent hover:underline">← Back to log in</button>
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
