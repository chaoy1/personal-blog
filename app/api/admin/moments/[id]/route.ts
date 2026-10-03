import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, databaseResponse, deleteAdminResource } from '@/lib/admin-route'
import type { AdminRouteContext } from '@/lib/admin-route'
import { supabaseAdmin } from '@/lib/supabase'

export const PUT = withAdmin(async (req: NextRequest, { params }: AdminRouteContext) => {
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
  return databaseResponse(data, error)
})

export const DELETE = deleteAdminResource('moments')
