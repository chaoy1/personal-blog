import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  const { data, error } = await supabaseAdmin()
    .from('photos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
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
  const url = typeof body.url === 'string' ? body.url.trim() : ''
  const caption = typeof body.caption === 'string' ? body.caption.trim() : ''
  if (!url) {
    return NextResponse.json({ error: '缺少圖片地址' }, { status: 400 })
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
    .from('photos')
    .insert({ user_id: owner.id, url, caption })
    .select('*')
    .single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
