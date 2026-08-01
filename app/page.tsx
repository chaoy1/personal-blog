import Link from 'next/link'
import { listPublishedPosts, formatDate, type Post } from '@/lib/posts'
import { SITE_NAME, SITE_DESC, SITE_VERSE } from '@/lib/site'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  let posts: Post[] = []
  let setupHint = false

  try {
    posts = await listPublishedPosts()
  } catch {
    setupHint = true
  }

  const year = new Date().getFullYear()
  const volume = String(posts.length).padStart(2, '0')

  return (
    <div className="shell">
      <header className="masthead">
        <div className="rail" aria-hidden="true">
          记于 {year}
        </div>
        <p className="eyebrow reveal d1">Personal Blog · Vol.{volume}</p>
        <h1 className="reveal d2">
          {SITE_NAME}
          <span className="seal" aria-hidden="true">
            记
          </span>
        </h1>
        <p className="lede reveal d3">
          {SITE_DESC}。{SITE_VERSE}。
        </p>
      </header>

      {setupHint ? (
        <div className="setup-hint reveal d4">
          <strong>数据库还没配置好。</strong>完成下面两步即可看到文章：
          <br />
          1. 在 Supabase 控制台 SQL Editor 里运行 <code>supabase/schema.sql</code> 建表；
          <br />
          2. 把 <code>.env.local</code> 里的 Supabase 三项配置填好，然后重启{' '}
          <code>npm run dev</code>。
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state reveal d4">
          <div className="big">空</div>
          还没有文章。到 <Link href="/admin">后台控制台</Link> 写下第一篇吧。
        </div>
      ) : (
        <section className="post-list">
          {posts.map((post, i) => (
            <Link
              key={post.id}
              href={`/posts/${post.slug}`}
              className="post-row reveal d4"
              style={{ animationDelay: `${Math.min(i, 6) * 80 + 120}ms` }}
            >
              <span className="post-num">{String(i + 1).padStart(2, '0')}</span>
              <time className="post-date" dateTime={post.created_at}>
                {formatDate(post.created_at)}
              </time>
              <span>
                <span className="post-title">{post.title}</span>
                {post.excerpt ? (
                  <span className="post-excerpt">{post.excerpt}</span>
                ) : null}
              </span>
            </Link>
          ))}
        </section>
      )}

      <footer className="site-footer">
        <span>
          {SITE_NAME} · {year}
        </span>
        <Link href="/admin">后台</Link>
      </footer>
    </div>
  )
}
