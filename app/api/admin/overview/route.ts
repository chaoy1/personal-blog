import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/admin-route'
import { readAdminOverview } from '@/lib/admin-overview'
export const dynamic = 'force-dynamic'
export const GET = withAdmin(async (req: NextRequest) => {
  try {
    return NextResponse.json(await readAdminOverview(), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: '总览暂时无法读取，请稍后重试。' }, { status: 500 })
  }
})
