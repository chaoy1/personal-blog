import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'blog_admin_session'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!pathname.startsWith('/admin')) return NextResponse.next()

  const authed = req.cookies.get(SESSION_COOKIE)?.value === '1'

  if (pathname === '/admin/login') {
    if (authed) {
      const url = req.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  if (!authed) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
