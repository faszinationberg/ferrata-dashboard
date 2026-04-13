import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Diese Zeile sagt Next.js: "Mach einfach gar nichts und lass die Anfrage durch."
  return NextResponse.next();
}

// Der Matcher bestimmt, für welche Pfade die Middleware gelten soll.
// Wenn wir ihn leer lassen oder auf Pfade setzen, die nicht existieren, 
// wird die Middleware faktisch nie aktiv.
export const config = {
  matcher: [
    /*
     * Matcher leer lassen oder gezielt Dateien ausschließen:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
