export const dynamic = 'force-dynamic';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { Nav } from '@/components/Nav';
import { AuthModal } from '@/components/AuthModal';

export const metadata: Metadata = {
  title: 'Base — powered by Callstream AI',
  description: 'Fix and vibe-code voice AI agents in the Based language. No coding skills required.',
  applicationName: 'Base — powered by Callstream AI',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Base AI', statusBarStyle: 'black-translucent' },
  openGraph: {
    title: 'Base — powered by Callstream AI',
    description: 'Debug and generate voice AI agents in Based — no code skills needed.',
    type: 'website',
  },
  icons: { icon: '/favicon.svg', apple: '/favicon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#000000',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-ink-800 antialiased">
        <AuthProvider>
          <Nav />
          <AuthModal />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
