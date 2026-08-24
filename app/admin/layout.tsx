import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import AdminHeader from '@/components/AdminHeader'
import AdminNav from '@/components/AdminNav'
import ThemeToggle from '@/components/ThemeToggle'
import { AdminFeedbackProvider } from '@/components/admin/AdminFeedback'
import { SITE_NAME } from '@/lib/site'

export const metadata: Metadata = {
  title: '后台管理',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminFeedbackProvider>
      <div className="admin-shell">
        <header className="admin-head">
          <Link href="/admin" className="admin-brand">
            <span className="admin-brand-mark" aria-hidden="true">写</span>
            <span>
              <b>{SITE_NAME}</b>
              <small>WRITING STUDIO</small>
            </span>
          </Link>
          <AdminNav />
          <div className="admin-head-foot">
            <div className="admin-theme-control">
              <span>昼夜</span>
              <ThemeToggle />
            </div>
            <Link href="/" className="admin-view-blog">查看博客 ↗</Link>
            <AdminHeader />
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </AdminFeedbackProvider>
  )
}
