import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 1. Der neue SSR-Client (für Login & Middleware-Kompatibilität)
export const createClient = () =>
  createBrowserClient(supabaseUrl, supabaseAnonKey)

// 2. Der klassische Export (für deine bestehenden Seiten, damit die Fehler verschwinden)
export const supabase = createSupabaseJsClient(supabaseUrl, supabaseAnonKey)