import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. SYSTEM-PFADE IGNORIEREN (Wichtig gegen das Log-Spamming)
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') || 
    pathname.includes('.well-known') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 2. AUTH-CHECK
//  const { data: { user } } = await supabase.auth.getUser()
  
// Ändere:
// const { data: { user } } = await supabase.auth.getUser()

// In (zum Testen):
const { data: { session } } = await supabase.auth.getSession()
const user = session?.user

  // LOG FÜR DICH IM TERMINAL
  console.log(`Middleware: ${pathname} | User: ${user ? 'EINGELOGGT' : 'NICHT EINGELOGGT'}`)

  const isPublicPath = 
    pathname === '/' || 
    pathname === '/login' || 
    pathname === '/report' || 
    (pathname.startsWith('/ferrata/') && pathname.includes('/report'))

  // 3. REDIRECT LOGIK
  if (!isPublicPath && !user) {
    console.log("-> Redirect to Login");
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(url)
  }

  if (pathname === '/login' && user) {
    console.log("-> Schon eingeloggt, ab zum Dashboard");
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Überwacht alles außer statische Assets
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}