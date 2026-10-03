'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'
import AdminHeader from '@/components/AdminHeader'
import { SITE_NAME } from '@/lib/site'

const pages = [['/admin', '案', '管理总览'], ['/admin/posts', '文', '文章'], ['/admin/moments', '语', '闲语'], ['/admin/photos', '影', '光影'], ['/admin/profile', '署', '博主资料']] as const
export default function AdminPaperFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/admin'
  const [owner, setOwner] = useState('小屋主人')
  const active = pathname.startsWith('/admin/editor') || pathname.startsWith('/admin/preview') ? '/admin/posts' : pathname
  const title = pages.find(([href]) => href === active)?.[2] || '小屋内务'
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/profile', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) return
      const result = await response.json()
      if (!controller.signal.aborted) setOwner(result?.nickname || '小屋主人')
    }).catch(() => {})
    return () => controller.abort()
  }, [pathname])
  return <div className="desk-scene"><div className="desk-studio">
    <aside className="desk-sidebar" aria-label="后台导航">
      <Link href="/admin" className="desk-brand"><i className="desk-seal" aria-hidden="true">写</i><span>{SITE_NAME}<small>WRITING STUDIO</small></span></Link>
      <p className="desk-sidebar-caption">小屋内务</p>
      <nav aria-label="管理功能">{pages.map(([href, mark, label]) => <Link key={href} href={href} aria-current={href === active ? 'page' : undefined} aria-label={label}><i aria-hidden="true">{mark}</i><span>{label}</span><b aria-hidden="true">↗</b></Link>)}</nav>
      <div className="desk-sidebar-foot"><Link href="/">去前台看看 <span aria-hidden="true">↗</span></Link><div className="desk-owner desk-paper-owner"><span className="desk-owner-seal" aria-hidden="true">署</span><span><b>{owner}</b><small>山窗常开 · 文字常新</small></span></div></div>
    </aside>
    <main className="desk-sub-main"><header className="ap-topline"><Link href="/admin">案头 / {title}</Link><div className="desk-paper-actions"><ThemeToggle /><AdminHeader /></div></header>{children}</main>
  </div></div>
}
