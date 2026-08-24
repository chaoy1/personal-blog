'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/admin', index: '01', label: '文章', match: (path: string) => path === '/admin' || path.startsWith('/admin/editor') },
  { href: '/admin/moments', index: '02', label: '闲语', match: (path: string) => path.startsWith('/admin/moments') },
  { href: '/admin/photos', index: '03', label: '光影', match: (path: string) => path.startsWith('/admin/photos') },
  { href: '/admin/profile', index: '04', label: '资料', match: (path: string) => path.startsWith('/admin/profile') },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="后台功能">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={item.match(pathname) ? 'active' : undefined}
          aria-current={item.match(pathname) ? 'page' : undefined}
        >
          <i>{item.index}</i>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}
