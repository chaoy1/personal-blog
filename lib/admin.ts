import { NextRequest } from 'next/server'

export function isAdminRequest(req: NextRequest): boolean {
  return req.cookies.get('blog_admin_session')?.value === '1'
}
