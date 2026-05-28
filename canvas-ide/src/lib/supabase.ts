import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL  as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = !!(url && key)

// createClient requires non-empty strings; fall back to placeholders so the
// module loads cleanly even when env vars are absent (auth calls will simply fail).
export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  key ?? 'placeholder-anon-key'
)

/** Create a separate Supabase client for the *app's own* backend (not the IDE's). */
export function createAppClient(url: string, anonKey: string) {
  if (!url || !anonKey) return null
  try { return createClient(url, anonKey) }
  catch { return null }
}

// ─── Shared types ─────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string
  username: string | null
  bio: string | null
  avatar_url: string | null
  updated_at: string
}

export interface CloudProject {
  id: string
  user_id: string
  name: string
  data: Record<string, unknown>
  created_at: string
  updated_at: string
}
