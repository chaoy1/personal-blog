import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * 公开注册：使用 service_role 直接创建已确认账号（无需邮件验证），
 * 并写入 profiles 资料，随后前端自动登录。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const nickname =
    typeof body.nickname === 'string' && body.nickname.trim()
      ? body.nickname.trim()
      : email.split('@')[0] || '旅人'

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: '密码至少需要 6 位' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`,
      {
        method: 'POST',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: { nickname },
        }),
      }
    )
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      const msg =
        j.msg || (res.status === 422 ? '该邮箱已注册，请直接登录' : '注册失败，请稍后再试')
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const user = await res.json()

    const { error: profileErr } = await supabaseAdmin().from('profiles').upsert({
      id: user.id,
      nickname,
    })
    if (profileErr) {
      return NextResponse.json({ error: '资料初始化失败，请重试' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: '注册失败，请稍后再试' }, { status: 500 })
  }
}
