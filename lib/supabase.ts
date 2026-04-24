import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 2. Der klassische Export (für deine bestehenden Seiten, damit die Fehler verschwinden)
export const supabase = createSupabaseJsClient(supabaseUrl, supabaseAnonKey)

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: 'sb-auth-token', // Ein fester Name hilft oft
        domain: '', // Leer lassen, damit es für die aktuelle Domain gilt
        path: '/',
        sameSite: 'lax',
        secure: true, // Muss auf Vercel true sein
      }
    }
  )