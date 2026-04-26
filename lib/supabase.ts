import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Wir exportieren NUR noch createClient. 
// Den alten "export const supabase = ..." löschen wir komplett!
export const createClient = () =>
  createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      name: 'sb-auth-token', // Ein fester Name verhindert doppelte Instanzen
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production', // true auf Vercel, false lokal
    },
  })