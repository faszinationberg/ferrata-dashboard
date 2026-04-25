import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          // WICHTIG für Vercel: Cookies müssen explizit in die Response
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Nutze getSession statt getUser für den Cloud-Check (schneller & stabiler auf Vercel)
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  const { pathname } = request.nextUrl

  // 1. Statische Dateien & API komplett ignorieren
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') || 
    pathname.includes('.') || // Ignoriert .js, .css, .png etc.
    pathname === '/favicon.ico'
  ) {
    return response
  }

  // 2. Pfad-Logik
  const isPublicPath = 
    pathname === '/' || 
    pathname === '/login' || 
    pathname === '/report' || 
    pathname.includes('/report')

  // Wenn nicht eingeloggt und geschützter Pfad -> Login
  if (!isPublicPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(url)
  }

  // Wenn eingeloggt und auf Login -> Dashboard
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}