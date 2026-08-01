import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}))
  const expected = process.env.ADMIN_PASSWORD

  if (!expected) {
    return NextResponse.json(
      { error: '服务器未配置 ADMIN_PASSWORD' },
      { status: 500 }
    )
  }
  if (typeof password !== 'string' || password !== expected) {
    return NextResponse.json({ error: '密码错误' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  const isHttps =
    req.nextUrl.protocol === 'https:' || process.env.VERCEL === '1'
  res.cookies.set('blog_admin_session', '1', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: isHttps,
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
