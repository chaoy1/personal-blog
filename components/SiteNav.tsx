'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Fragment, useEffect, useRef, useState } from 'react'
import { SITE_NAME } from '@/lib/site'
import ThemeToggle from '@/components/ThemeToggle'
import LangToggle from '@/components/LangToggle'
import { useAppStore } from '@/lib/app-store'
import SearchPalette from '@/components/SearchPalette'

type NavLink = {
  href: string
  label: string
  match?: (pathname: string) => boolean
}

const LINKS: NavLink[] = [
  { href: '/', label: '首页', match: (p) => p === '/' },
  { href: '/posts', label: '文章', match: (p) => p.startsWith('/posts') },
  { href: '/moments', label: '闲语', match: (p) => p.startsWith('/moments') },
  { href: '/album', label: '光影', match: (p) => p.startsWith('/album') },
  { href: '/timeline', label: '时间轴', match: (p) => p.startsWith('/timeline') },
  { href: '/guestbook', label: '留言', match: (p) => p.startsWith('/guestbook') },
  { href: '/about', label: '关于', match: (p) => p.startsWith('/about') },
]

export default function SiteNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, signOut } = useAppStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreToggleFocus = useRef(false)

  useEffect(() => setMenuOpen(false), [pathname])

  useEffect(() => {
    if (!menuOpen) {
      if (restoreToggleFocus.current) {
        toggleRef.current?.focus()
        restoreToggleFocus.current = false
      }
      return
    }

    restoreToggleFocus.current = true
    panelRef.current?.querySelector<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')?.focus()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  function trapMenuFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel) return

    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) return

    const active = document.activeElement
    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  // 注意：必须在所有 hook 之后才能提前返回
  if (pathname.startsWith('/admin')) return null

  async function logout() {
    await signOut()
    router.refresh()
  }

  return (
    <nav className={`site-nav${menuOpen ? ' menu-open' : ''}`}>
      <Link href="/" className="nav-brand">
        {SITE_NAME}
      </Link>
      <div className="nav-links">
        {LINKS.map((link, index) => {
          const active = link.match ? link.match(pathname) : false
          return (
            <Fragment key={link.href}>
              <Link
                href={link.href}
                className={active ? 'active' : undefined}
                aria-current={active ? 'page' : undefined}
              >
                {link.label}
              </Link>
              {index < LINKS.length - 1 ? <span className="nav-divider" aria-hidden="true" /> : null}
            </Fragment>
          )
        })}
      </div>
      <div className="nav-side">
        {user ? (
          <>
            <Link
              href="/account"
              className="nav-user"
              title="个人资料"
              style={pathname.startsWith('/account') ? { color: 'var(--ink)' } : undefined}
            >
              <span className="nav-user-dot" />
              {profile?.nickname || user.email?.split('@')[0] || '我'}
            </Link>
            <button type="button" className="nav-link-btn" onClick={logout}>
              退出
            </button>
          </>
        ) : (
          <Link href="/login" className={pathname.startsWith('/login') ? 'active' : undefined}>
            登录
          </Link>
        )}
        <SearchPalette />
        <LangToggle />
        <ThemeToggle />
        <button
          ref={toggleRef}
          type="button"
          className="mobile-nav-toggle"
          aria-label={menuOpen ? '收起导航' : '展开导航'}
          aria-expanded={menuOpen}
          aria-controls="mobile-site-menu"
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span />
          <span />
        </button>
      </div>
      <div
        ref={panelRef}
        id="mobile-site-menu"
        className="mobile-nav-panel"
        aria-hidden={!menuOpen}
        onKeyDown={trapMenuFocus}
      >
        <div className="mobile-nav-caption">
          <span>游园路径</span>
          <i>PATHS THROUGH THE SCROLL</i>
        </div>
        <div className="mobile-nav-links">
          {LINKS.map((link, index) => {
            const active = link.match ? link.match(pathname) : false
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? 'active' : undefined}
                aria-current={active ? 'page' : undefined}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <b>{link.label}</b>
                <i aria-hidden="true">↗</i>
              </Link>
            )
          })}
        </div>
        <div className="mobile-nav-account">
          <span className="mobile-nav-language">
            <span>字形</span>
            <LangToggle />
          </span>
          {user ? (
            <>
              <Link href="/account">{profile?.nickname || user.email?.split('@')[0] || '个人资料'}</Link>
              <button type="button" onClick={logout}>退出登录</button>
            </>
          ) : (
            <Link href="/login">登录后参与留言与评论</Link>
          )}
        </div>
      </div>
    </nav>
  )
}
