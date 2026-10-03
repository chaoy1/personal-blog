import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import AdminRouteFrame from '@/components/admin/AdminRouteFrame'
import { AdminFeedbackProvider } from '@/components/admin/AdminFeedback'
import './overview.css'
import './paper-subpages.css'

export const metadata: Metadata = {
  title: '后台管理',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminFeedbackProvider>
      <AdminRouteFrame>{children}</AdminRouteFrame>
    </AdminFeedbackProvider>
  )
}
