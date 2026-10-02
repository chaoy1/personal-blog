import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin'
import { readAdminOverview } from '@/lib/admin-overview'
export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: '未登录' }, { status: 401 })
  try {
    return NextResponse.json(await readAdminOverview(), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: '总览暂时无法读取，请稍后重试。' }, { status: 500 })
  }
}
