import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  const { data } = await supabaseAdmin()
    .from('profiles')
    .select('id, nickname, bio, avatar_url, role')
    .eq('role', 'owner')
    .maybeSingle()
  return NextResponse.json(data ?? null)
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))

  const { data: existing } = await supabaseAdmin()
    .from('profiles')
    .select('id, nickname, bio, avatar_url')
    .eq('role', 'owner')
    .maybeSingle()

  let ownerId = existing?.id ?? null
  if (!ownerId) {
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || password.length < 6) {
      return NextResponse.json(
        { error: '创建博主账号需要邮箱和至少 6 位密码' },
        { status: 400 }
      )
    }
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
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
        user_metadata: { nickname: body.nickname || email.split('@')[0] },
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      return NextResponse.json({ error: j.msg || '创建账号失败' }, { status: 400 })
    }
    const user = await res.json()
    ownerId = user.id
  }

  const nickname =
    typeof body.nickname === 'string' ? body.nickname.trim() : existing?.nickname ?? ''
  const bio = typeof body.bio === 'string' ? body.bio : existing?.bio ?? ''
  const avatar_url =
    typeof body.avatar_url === 'string' ? body.avatar_url : existing?.avatar_url ?? ''

  const { error } = await supabaseAdmin().from('profiles').upsert({
    id: ownerId,
    nickname,
    bio,
    avatar_url,
    role: 'owner',
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
