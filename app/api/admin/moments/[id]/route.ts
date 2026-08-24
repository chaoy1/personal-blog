import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase'

type Ctx = {
  params: Promise<{ id: string }>
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  const images = Array.isArray(body.images)
    ? body.images.filter((item: unknown): item is string => typeof item === 'string')
    : []
  if (!content && images.length === 0) {
    return NextResponse.json({ error: '内容不能为空' }, { status: 400 })
  }

  const { id } = await params
  const { data, error } = await supabaseAdmin()
    .from('moments')
    .update({ content, images })
    .eq('id', id)
    .select('*')
    .single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  const { id } = await params
  const { error } = await supabaseAdmin().from('moments').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
