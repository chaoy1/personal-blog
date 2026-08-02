'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { SITE_NAME } from '@/lib/site'
import ThemeToggle from '@/components/ThemeToggle'
import { supabaseBrowser } from '@/lib/supabase-browser'

type NavLink = {
  href: string
  label: string
  match?: (pathname: string) => boolean
}

const LINKS: NavLink[] = [
  { href: '/', label: '首頁', match: (p) => p === '/' },
  { href: '/posts', label: '文章', match: (p) => p.startsWith('/posts') },
  { href: '/moments', label: '說說', match: (p) => p.startsWith('/moments') },
  { href: '/album', label: '相冊', match: (p) => p.startsWith('/album') },
  { href: '/timeline', label: '時間軸', match: (p) => p.startsWith('/timeline') },
  { href: '/guestbook', label: '留言', match: (p) => p.startsWith('/guestbook') },
  { href: '/about', label: '關於', match: (p) => p.startsWith('/about') },
]

export default function SiteNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)

  useEffect(() => {
    const sb = supabaseBrowser()
    sb.auth
      .getSession()
      .then(({ data }) => setUser(data.session?.user ?? null))
      .catch(() => setUser(null))
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // 注意：必须在所有 hook 之后才能提前返回
  if (pathname.startsWith('/admin')) return null

  async function logout() {
    await supabaseBrowser().auth.signOut()
    router.refresh()
  }

  return (
    <nav className="site-nav">
      <Link href="/" className="nav-brand">
        {SITE_NAME}
      </Link>
      <div className="nav-links">
        {LINKS.map((link) => {
          const active = link.match ? link.match(pathname) : false
          return (
            <Link key={link.href} href={link.href} className={active ? 'active' : undefined}>
              {link.label}
            </Link>
          )
        })}
      </div>
      <div className="nav-side">
        {user ? (
          <>
            <Link
              href="/account"
              className="nav-user"
              title="個人資料"
              style={pathname.startsWith('/account') ? { color: 'var(--ink)' } : undefined}
            >
              <span className="nav-user-dot" />
              {user.email?.split('@')[0] ?? '我'}
            </Link>
            <button type="button" className="nav-link-btn" onClick={logout}>
              退出
            </button>
          </>
        ) : (
          <Link href="/login" className={pathname.startsWith('/login') ? 'active' : undefined}>
            登錄
          </Link>
        )}
        <ThemeToggle />
      </div>
    </nav>
  )
}
