import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase'

export type AdminRouteContext = { params: Promise<{ id: string }> }

/** Do not consume request input or access private data before the admin guard. */
export function withAdmin<Args extends unknown[]>(
  handler: (req: NextRequest, ...args: Args) => Promise<NextResponse>,
) {
  return async (req: NextRequest, ...args: Args): Promise<NextResponse> => {
    if (!isAdminRequest(req)) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    return handler(req, ...args)
  }
}

export function databaseResponse<T>(
  data: T,
  error: { message: string } | null,
  status = 200,
) {
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status })
}

/** These resources share hard-delete semantics; posts retain their trash workflow. */
export function deleteAdminResource(table: 'albums' | 'moments' | 'photos') {
  return withAdmin(async (_req: NextRequest, { params }: AdminRouteContext) => {
    const { id } = await params
    const { error } = await supabaseAdmin().from(table).delete().eq('id', id)
    return databaseResponse({ ok: true }, error)
  })
}
