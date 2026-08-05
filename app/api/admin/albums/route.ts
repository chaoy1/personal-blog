import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  const { data, error } = await supabaseAdmin()
    .from('albums')
    .select('*')
    .order('created_at', { ascending: false })
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
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  if (!title) {
    return NextResponse.json({ error: '缺少相册标题' }, { status: 400 })
  }

  const { data: owner } = await supabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('role', 'owner')
    .maybeSingle()
  if (!owner) {
    return NextResponse.json({ error: '尚未设置博主账号' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin()
    .from('albums')
    .insert({ user_id: owner.id, title, description })
    .select('*')
    .single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
