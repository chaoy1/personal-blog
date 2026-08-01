import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import AdminHeader from '@/components/AdminHeader'
import { SITE_NAME } from '@/lib/site'

export const metadata: Metadata = {
  title: '后台管理',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-shell">
      <header className="admin-head">
        <Link href="/admin" className="admin-brand">
          {SITE_NAME} · 后台
        </Link>
        <nav>
          <Link href="/">查看博客</Link>
          <AdminHeader />
        </nav>
      </header>
      {children}
    </div>
  )
}
