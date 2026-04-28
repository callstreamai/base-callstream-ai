import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Server-side (service role) ──────────────────────────────────────────────
let _serverClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_serverClient) return _serverClient;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _serverClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _serverClient;
}

// ─── Browser (anon key) — returns null when not configured ───────────────────
let _browserClient: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient | null {
  if (_browserClient) return _browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _browserClient = createClient(url, key, { auth: { persistSession: true } });
  return _browserClient;
}

export const ATTACHMENTS_BUCKET = 'attachments';
