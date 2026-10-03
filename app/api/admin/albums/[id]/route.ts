import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, databaseResponse, deleteAdminResource } from '@/lib/admin-route'
import type { AdminRouteContext } from '@/lib/admin-route'
import { supabaseAdmin } from '@/lib/supabase'

export const PATCH = withAdmin(async (req: NextRequest, { params }: AdminRouteContext) => {
  const body = await req.json().catch(() => ({}))
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  if (!title) {
    return NextResponse.json({ error: '相册标题不能为空' }, { status: 400 })
  }

  const { id } = await params
  const { data, error } = await supabaseAdmin()
    .from('albums')
    .update({ title, description })
    .eq('id', id)
    .select('*')
    .single()
  return databaseResponse(data, error)
})

export const DELETE = deleteAdminResource('albums')
