import Link from 'next/link'
import type { CSSProperties } from 'react'
import { listPublishedPosts, formatDate, type Post } from '@/lib/posts'
import { SITE_NAME, SITE_DESC, SITE_VERSE } from '@/lib/site'
import { isSupabaseConfigured } from '@/lib/supabase'
import { listAllMoments, listAllPhotos, countMoments, countPhotos, type TimelineMoment, type TimelinePhoto } from '@/lib/timeline'
import { listLatestGuestbook, countGuestbook, type GuestbookMessage } from '@/lib/guestbook'
import ScrollFX from '@/components/ScrollFX'
import ScrollUnfold from '@/components/ScrollUnfold'
import ScrollHint from '@/components/ScrollHint'

export const revalidate = 60

const CN_NO = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾']
const CN_WM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

export default async function HomePage() {
  let posts: Post[] = []
  let dbError = false
  let moments: TimelineMoment[] = []
  let photos: TimelinePhoto[] = []
  let guestbook: GuestbookMessage[] = []
  let momentCount = 0
  let photoCount = 0
  let guestbookCount = 0

  try {
    posts = await listPublishedPosts(6)
  } catch {
    dbError = true
  }
  try {
    moments = await listAllMoments(3)
    momentCount = await countMoments()
  } catch {
    // 说说区块可缺省
  }
  try {
    photos = await listAllPhotos(8)
    photoCount = await countPhotos()
  } catch {
    // 相册区块可缺省
  }
  try {
    guestbook = await listLatestGuestbook(3)
    guestbookCount = await countGuestbook()
  } catch {
    // 留言区块可缺省
  }

  const notConfigured = !isSupabaseConfigured()
  const volume = String(posts.length).padStart(2, '0')

  return (
    <div className="wrap">
      <ScrollFX />
      <ScrollUnfold />

      <div className="verse">
        言有尽而<b>意</b>无穷
      </div>
      <div className="sigil">丙午 · {SITE_NAME}集</div>

      <div className="home-hero">
        <header className="masthead">
          <p className="eyebrow">留白处自有山河 · VOL.{volume}</p>
          <h1>
            <span className="title">
              {SITE_NAME.split('').map((ch, i) => (
                <span key={i} className="title-char" style={{ '--i': i } as CSSProperties}>
                  {ch}
                </span>
              ))}
            </span>
            <span className="seal" aria-hidden="true">
              记
            </span>
          </h1>
          <svg className="stroke" viewBox="0 0 250 28" aria-hidden="true">
            <path
              d="M4 16 C 42 7, 94 20, 138 12 S 218 7, 246 14"
              className="stroke-main"
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
              opacity="0.78"
            />
            <path
              d="M10 21 C 62 15, 124 23, 186 17 S 236 14, 244 17"
              className="stroke-thin"
              strokeWidth={1.6}
              fill="none"
              strokeLinecap="round"
              opacity="0.42"
            />
            <path
              d="M124 3 C 156 8, 176 10, 204 7"
              className="stroke-red"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              opacity="0.55"
            />
          </svg>
          <p className="lede">
            {SITE_DESC}。{SITE_VERSE}。
          </p>
        </header>

        <div className="hero-stats">
          <div className="hs-box">
            <b>{posts.length}</b>
            <span>篇章</span>
            <i aria-hidden="true">卷</i>
          </div>
          <div className="hs-box">
            <b>{momentCount}</b>
            <span>闲语</span>
            <i aria-hidden="true">语</i>
          </div>
          <div className="hs-box">
            <b>{photoCount}</b>
            <span>光影</span>
            <i aria-hidden="true">影</i>
          </div>
        </div>

        <div className="hero-actions">
          <Link href="/timeline">时间轴</Link>
          <Link href="/guestbook">留言板</Link>
          <Link href="/about">关于</Link>
        </div>

        <ScrollHint />
      </div>

      {notConfigured ? (
        <div className="setup-hint">
          <strong>数据库还没配置好。</strong>完成下面两步即可看到文章：
          <br />
          1. 在 Supabase 控制台 SQL Editor 里运行 <code>supabase/schema.sql</code> 建表；
          <br />
          2. 把 <code>.env.local</code> 里的 Supabase 三项配置填好，然后重启 <code>npm run dev</code>。
        </div>
      ) : dbError ? (
        <div className="setup-hint">
          <strong>文章暂时没能加载出来。</strong>
          <br />
          数据库连接出了点问题，页面稍后会自动重试，也可以先去别处逛逛。
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="big">空</div>
          还没有文章。到 <Link href="/admin">后台</Link> 写下第一篇吧。
        </div>
      ) : (
        <>
          <section className="home-section" id="posts">
            <h2 className="section-title">
              <span>篇章</span>
              <Link href="/posts">更多 →</Link>
            </h2>
            <div className="list">
              {posts.map((post, i) => (
                <Link key={post.id} href={`/posts/${post.slug}`} className="item">
                  <span className="no">
                    {i < CN_NO.length ? CN_NO[i] : String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="tag-seal" aria-hidden="true">
                    阅
                  </span>
                  <span className="wm" aria-hidden="true">
                    {i < CN_WM.length ? CN_WM[i] : ''}
                  </span>
                  <h2 className="post-title">{post.title}</h2>
                  {post.excerpt ? <span className="ex">{post.excerpt}</span> : null}
                  <span className="item-foot">
                    <span className="date">{formatDate(post.created_at)}</span>
                    <span className="read">阅读全文</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {moments.length > 0 ? (
            <section className="home-section reveal" id="moments">
              <h2 className="section-title">
                <span>闲语</span>
                <Link href="/moments">更多 →</Link>
              </h2>
              <div className="home-moments">
                {moments.map((m) => (
                  <Link key={m.id} href="/moments" className="hm-card">
                    {m.images.length > 0 ? (
                      <span className="hm-thumbs">
                        {m.images.slice(0, 3).map((u, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={u} alt="" loading="lazy" />
                        ))}
                      </span>
                    ) : null}
                    <span className="hm-text">{m.content || '（一张图，胜过千言）'}</span>
                    <span className="hm-date">{formatDate(m.created_at)}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {photos.length > 0 ? (
            <section className="home-section reveal" id="photos">
              <h2 className="section-title">
                <span>光影</span>
                <Link href="/album">更多 →</Link>
              </h2>
              <div className="home-photos">
                {photos.slice(0, 8).map((p) => (
                  <Link key={p.id} href="/album" className="hp-item">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.caption || '照片'} loading="lazy" />
                    {p.caption ? <span className="hp-cap">{p.caption}</span> : null}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {guestbook.length > 0 ? (
            <section className="home-section reveal" id="guestbook">
              <h2 className="section-title">
                <span>留声{guestbookCount > 0 ? ` · ${guestbookCount}` : ''}</span>
                <Link href="/guestbook">更多 →</Link>
              </h2>
              <div className="home-guest">
                {guestbook.map((g) => (
                  <Link key={g.id} href="/guestbook" className="hg-card">
                    <span className="hg-head">
                      <b>{g.nickname || '旅人'}</b>
                      <time>{formatDate(g.created_at)}</time>
                    </span>
                    <span className="hg-text">{g.content}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <footer className="home-footer">
        <div className="footer-line">
          言有尽 · 意无穷 · <Link href="/admin">管理</Link>
        </div>
        <span className="footer-seal" aria-hidden="true">
          墨
        </span>
      </footer>
    </div>
  )
}
