import { NextRequest, NextResponse } from 'next/server'
import { safeAdminNext } from '@/lib/admin-return'

const SESSION_COOKIE = 'blog_admin_session'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!pathname.startsWith('/admin')) return NextResponse.next()

  const authed = req.cookies.get(SESSION_COOKIE)?.value === '1'

  if (pathname === '/admin/login') {
    if (authed) {
      const url = req.nextUrl.clone()
      const destination = new URL(safeAdminNext(req.nextUrl.searchParams.get('next')), url)
      url.pathname = destination.pathname
      url.search = destination.search
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  if (!authed) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/login'
    url.search = new URLSearchParams({ next: `${req.nextUrl.pathname}${req.nextUrl.search}` }).toString()
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
