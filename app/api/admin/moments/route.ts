import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  const { data, error } = await supabaseAdmin()
    .from('moments')
    .select('*, profiles!moments_user_id_fkey(nickname, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  const images = Array.isArray(body.images)
    ? body.images.filter((i: unknown): i is string => typeof i === 'string')
    : []
  if (!content && images.length === 0) {
    return NextResponse.json({ error: '內容不能為空' }, { status: 400 })
  }

  const { data: owner } = await supabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('role', 'owner')
    .maybeSingle()
  if (!owner) {
    return NextResponse.json(
      { error: '尚未設置博主賬號，請先到「資料」頁創建或標記博主本人' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin()
    .from('moments')
    .insert({ user_id: owner.id, content, images })
    .select('*')
    .single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
