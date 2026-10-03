import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, databaseResponse } from '@/lib/admin-route'
import { supabaseAdmin } from '@/lib/supabase'

export const GET = withAdmin(async (req: NextRequest) => {
  const { data, error } = await supabaseAdmin()
    .from('albums')
    .select('*')
    .order('created_at', { ascending: false })
  return databaseResponse(data ?? [], error)
})

export const POST = withAdmin(async (req: NextRequest) => {
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
  return databaseResponse(data, error, 201)
})
