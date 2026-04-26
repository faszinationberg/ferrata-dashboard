import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
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
      // WICHTIG: Die Cookie-Optionen müssen hier identisch sein
      cookieOptions: {
        name: 'sb-auth-token',
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      }
    }
  )

  // Auth-Check
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  console.log(`PFAD: ${pathname} | USER: ${user ? 'EINGELOGGT' : 'NICHT GEFUNDEN'}`)

  // Statische Pfade ignorieren
  if (pathname.startsWith('/_next') || pathname.includes('.') || pathname === '/favicon.ico') {
    return response
  }

  const isPublicPath = pathname === '/' || pathname === '/login' || pathname.includes('/report')

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}