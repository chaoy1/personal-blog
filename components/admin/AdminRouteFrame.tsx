'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import AdminPaperFrame from '@/components/admin/AdminPaperFrame'

export default function AdminRouteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/admin' || pathname === '/admin/login') return <>{children}</>
  return <AdminPaperFrame>{children}</AdminPaperFrame>
}
