'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { useAuth } from '@/context/AuthContext';

const tabs = [
  { href: '/debugging', label: 'Debugging' },
  { href: '/vibe', label: 'Vibe' },
  { href: '/review', label: 'Review' },
];

export function Nav() {
  const pathname = usePathname();
  const { user, profile, openAuth, signOut, loading } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const initials = profile?.display_name
    ? profile.display_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-black/80 border-b border-ink-400/60">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center gap-3">
        {/* Logo + wordmark */}
        <Link href="/debugging" className="flex items-center gap-2.5 shrink-0">
          <Logo size={26} animated />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="font-bold text-[14px] tracking-tight">Base</span>
            <span className="text-[10px] text-ink-600 -mt-0.5">powered by Callstream AI</span>
          </div>
        </Link>

        {/* Tab nav */}
        <nav className="flex items-center gap-1 ml-4">
          {tabs.map((t) => {
            const active = pathname?.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-accent/15 text-accent'
                    : 'text-ink-600 hover:text-ink-800 hover:bg-ink-300/40'
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-ink-300 shimmer" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-[12px] font-bold text-accent hover:bg-accent/30 transition-colors"
              >
                {initials}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 w-52 bg-ink-200 border border-ink-400 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 pt-3 pb-2 border-b border-ink-400">
                    <div className="font-semibold text-[13px] truncate">
                      {profile?.display_name ?? user.email}
                    </div>
                    {profile?.company_name && (
                      <div className="text-[11px] text-ink-600 truncate">{profile.company_name}</div>
                    )}
                  </div>
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-[13px] hover:bg-ink-300 transition-colors"
                  >
                    Account settings
                  </Link>
                  <button
                    onClick={async () => { setMenuOpen(false); await signOut(); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-danger hover:bg-ink-300 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAuth('login')}
                className="text-sm font-semibold text-ink-600 hover:text-ink-800 transition-colors px-2 py-1"
              >
                Log in
              </button>
              <button
                onClick={() => openAuth('signup')}
                className="text-sm font-bold px-4 py-1.5 rounded-full bg-accent hover:bg-accent-hover text-white transition-colors"
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
