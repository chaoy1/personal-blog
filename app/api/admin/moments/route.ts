import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, databaseResponse } from '@/lib/admin-route'
import { supabaseAdmin } from '@/lib/supabase'

export const GET = withAdmin(async (req: NextRequest) => {
  const { data, error } = await supabaseAdmin()
    .from('moments')
    .select('*, profiles!moments_user_id_fkey(nickname, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(100)
  return databaseResponse(data ?? [], error)
})

export const POST = withAdmin(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}))
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  const images = Array.isArray(body.images)
    ? body.images.filter((i: unknown): i is string => typeof i === 'string')
    : []
  if (!content && images.length === 0) {
    return NextResponse.json({ error: '内容不能为空' }, { status: 400 })
  }

  const { data: owner } = await supabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('role', 'owner')
    .maybeSingle()
  if (!owner) {
    return NextResponse.json(
      { error: '尚未设置博主账号，请先到「资料」页创建或标记博主本人' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin()
    .from('moments')
    .insert({ user_id: owner.id, content, images })
    .select('*')
    .single()
  return databaseResponse(data, error, 201)
})
