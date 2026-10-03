import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, databaseResponse, deleteAdminResource } from '@/lib/admin-route'
import type { AdminRouteContext } from '@/lib/admin-route'
import { supabaseAdmin } from '@/lib/supabase'

export const PATCH = withAdmin(async (req: NextRequest, { params }: AdminRouteContext) => {
  const body = await req.json().catch(() => ({}))
  const updates: { caption?: string; album_id?: string | null; sort_order?: number } = {}

  if ('caption' in body) {
    if (typeof body.caption !== 'string') {
      return NextResponse.json({ error: '照片说明格式不正确' }, { status: 400 })
    }
    updates.caption = body.caption.trim()
  }
  if ('album_id' in body) {
    if (body.album_id !== null && typeof body.album_id !== 'string') {
      return NextResponse.json({ error: '相册格式不正确' }, { status: 400 })
    }
    updates.album_id = typeof body.album_id === 'string' && body.album_id ? body.album_id : null
  }
  if ('sort_order' in body) {
    if (!Number.isInteger(body.sort_order)) {
      return NextResponse.json({ error: '排序必须是整数' }, { status: 400 })
    }
    updates.sort_order = body.sort_order
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '没有可更新的字段' }, { status: 400 })
  }

  const { id } = await params
  const { data, error } = await supabaseAdmin()
    .from('photos')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  return databaseResponse(data, error)
})

export const DELETE = deleteAdminResource('photos')
