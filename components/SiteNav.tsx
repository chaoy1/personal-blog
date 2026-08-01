'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SITE_NAME } from '@/lib/site'

type NavLink = {
  href: string
  label: string
  external?: boolean
  match?: (pathname: string) => boolean
}

const LINKS: NavLink[] = [
  { href: '/', label: '首頁', match: (p: string) => p === '/' },
  { href: '/#posts', label: '文章', match: (p: string) => p.startsWith('/posts') },
  { href: '/about', label: '關於', match: (p: string) => p.startsWith('/about') },
  { href: 'https://github.com/chaoy1/personal-blog', label: 'GitHub', external: true },
  { href: '/admin', label: '後臺', match: (p: string) => p.startsWith('/admin') },
]

export default function SiteNav() {
  const pathname = usePathname()

  if (pathname.startsWith('/admin')) return null

  return (
    <nav className="site-nav">
      <Link href="/" className="nav-brand">
        {SITE_NAME}
      </Link>
      <div className="nav-links">
        {LINKS.map((link) => {
          const active = link.match ? link.match(pathname) : false
          if (link.external) {
            return (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            )
          }
          return (
            <Link key={link.href} href={link.href} className={active ? 'active' : undefined}>
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
