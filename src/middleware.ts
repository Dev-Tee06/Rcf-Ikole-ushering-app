import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/home/:path*',
    '/services/:path*',
    '/accountability/:path*',
    '/attendance/:path*',
    '/profile/:path*',
    '/admin/:path*',
  ],
}
