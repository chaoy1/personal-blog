'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'

type SearchPost = {
  title: string
  excerpt: string
  slug: string
  createdAt: string
}

type SearchItem = {
  key: string
  href: string
  title: string
  detail: string
  kind: '篇' | '径'
}

const DESTINATIONS: SearchItem[] = [
  { key: 'nav-posts', href: '/posts', title: '文章', detail: '读长文与手记', kind: '径' },
  { key: 'nav-moments', href: '/moments', title: '闲语', detail: '看片刻与随想', kind: '径' },
  { key: 'nav-album', href: '/album', title: '光影', detail: '翻阅照片与相册', kind: '径' },
  { key: 'nav-timeline', href: '/timeline', title: '时间轴', detail: '循年月拾取往事', kind: '径' },
  { key: 'nav-guestbook', href: '/guestbook', title: '留言', detail: '在此留下只言片语', kind: '径' },
  { key: 'nav-about', href: '/about', title: '关于', detail: '认识这间小屋', kind: '径' },
]

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, '')
}

export default function SearchPalette() {
  const pathname = usePathname()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [posts, setPosts] = useState<SearchPost[]>([])
  const [loaded, setLoaded] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => setMounted(true), [])

  function openSearch() {
    openerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : triggerRef.current
    setOpen(true)
  }

  function closeSearch(restoreFocus = true) {
    const opener = openerRef.current
    setOpen(false)
    openerRef.current = null
    if (restoreFocus) {
      requestAnimationFrame(() => {
        if (opener?.isConnected) opener.focus()
      })
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (open) closeSearch()
        else openSearch()
      }
      if (event.key === 'Escape' && open) {
        event.preventDefault()
        closeSearch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    if (!open || loaded) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 6000)
    fetch('/api/search', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : []))
      .then((data: SearchPost[]) => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setPosts([]))
      .finally(() => {
        window.clearTimeout(timer)
        setLoaded(true)
      })
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [open, loaded])

  const results = useMemo<SearchItem[]>(() => {
    const postItems = posts.map((post) => ({
      key: `post-${post.slug}`,
      href: `/posts/${post.slug}`,
      title: post.title,
      detail: post.excerpt || new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(new Date(post.createdAt)),
      kind: '篇' as const,
    }))
    const all = [...DESTINATIONS, ...postItems]
    const keyword = normalize(query)
    if (!keyword) return all.slice(0, 9)
    return all
      .filter((item) => normalize(`${item.title}${item.detail}`).includes(keyword))
      .slice(0, 12)
  }, [posts, query])

  useEffect(() => setActive(0), [query])

  function choose(item: SearchItem) {
    closeSearch(false)
    router.push(item.href)
  }

  function trapFocus(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'input:not([disabled]), a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const dialog = open ? (
    <div className="search-layer" role="presentation" onMouseDown={() => closeSearch()}>
      <section
        ref={dialogRef}
        className="search-palette"
        role="dialog"
        aria-modal="true"
        aria-label="寻迹"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={trapFocus}
      >
        <header className="search-head">
          <span className="search-seal" aria-hidden="true">寻</span>
          <label htmlFor="site-search">寻一篇旧文，或去往一处</label>
          <kbd>ESC</kbd>
        </header>
        <input
          ref={inputRef}
          id="site-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActive((value) => Math.min(value + 1, results.length - 1))
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((value) => Math.max(value - 1, 0))
            }
            if (event.key === 'Enter' && results[active]) {
              event.preventDefault()
              choose(results[active])
            }
          }}
          placeholder="输入标题、词句或去处…"
          autoComplete="off"
        />
        <div className="search-results" role="listbox">
          {results.map((item, index) => (
            <Link
              key={item.key}
              href={item.href}
              className={index === active ? 'active' : undefined}
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setActive(index)}
              onClick={() => closeSearch(false)}
            >
              <span className="search-kind" aria-hidden="true">{item.kind}</span>
              <span className="search-copy">
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </span>
              <span className="search-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
          {results.length === 0 ? (
            <p className="search-empty"><b>空</b> 未寻得相合的文字</p>
          ) : null}
        </div>
        <footer className="search-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> 移步</span>
          <span><kbd>↵</kbd> 前往</span>
          <span>{loaded ? `已收录 ${posts.length} 篇` : '正在翻检卷册…'}</span>
        </footer>
      </section>
    </div>
  ) : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="nav-search"
        onClick={openSearch}
        aria-label="搜索文章与页面"
        title="寻迹（Ctrl / ⌘ + K）"
      >
        <span aria-hidden="true">寻</span>
        <kbd>⌘K</kbd>
      </button>
      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </>
  )
}
