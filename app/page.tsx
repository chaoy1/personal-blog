import Link from 'next/link'
import { listPublishedPosts, formatDate, type Post } from '@/lib/posts'
import { SITE_NAME, SITE_DESC, SITE_VERSE } from '@/lib/site'

export const dynamic = 'force-dynamic'

const CN_NO = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾']
const CN_WM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

export default async function HomePage() {
  let posts: Post[] = []
  let setupHint = false

  try {
    posts = await listPublishedPosts()
  } catch {
    setupHint = true
  }

  const volume = String(posts.length).padStart(2, '0')

  return (
    <div className="wrap">
      <div className="branch" aria-hidden="true">
        <svg viewBox="0 0 300 330" fill="none">
          <path className="stem" d="M292 4 C 246 46, 234 98, 216 156 S 186 244, 152 300" />
          <path className="stem thin" d="M262 72 C 244 84, 226 94, 204 106" />
          <path className="stem thin" d="M238 128 C 222 140, 204 152, 182 166" />
          <path className="stem thin" d="M208 196 C 196 210, 184 224, 168 240" />
          <path className="leaf" d="M204 106 C 218 82, 238 72, 258 66 C 244 90, 226 100, 204 106 Z" />
          <path className="leaf" d="M182 166 C 194 144, 212 132, 232 124 C 220 146, 202 158, 182 166 Z" />
          <path className="leaf" d="M168 240 C 178 220, 194 208, 212 200 C 202 222, 184 234, 168 240 Z" />
          <path className="leaf" d="M228 92 C 238 72, 254 60, 272 52 C 262 74, 246 86, 228 92 Z" />
          <path className="leaf" d="M150 300 C 156 282, 168 270, 182 262 C 176 282, 164 294, 150 300 Z" />
        </svg>
      </div>

      <div className="verse">
        言有盡而<b>意</b>無窮
      </div>
      <div className="sigil">丙午 · {SITE_NAME}集</div>

      <header className="masthead">
        <p className="eyebrow">留白處自有山河 · VOL.{volume}</p>
        <h1>
          <span className="title">{SITE_NAME}</span>
          <span className="seal" aria-hidden="true">
            記
          </span>
        </h1>
        <svg className="stroke" viewBox="0 0 250 28" aria-hidden="true">
          <path
            d="M4 16 C 42 7, 94 20, 138 12 S 218 7, 246 14"
            stroke="#33322b"
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            opacity="0.78"
          />
          <path
            d="M10 21 C 62 15, 124 23, 186 17 S 236 14, 244 17"
            stroke="#33322b"
            strokeWidth={1.6}
            fill="none"
            strokeLinecap="round"
            opacity="0.42"
          />
          <path
            d="M124 3 C 156 8, 176 10, 204 7"
            stroke="#a8322a"
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

      {setupHint ? (
        <div className="setup-hint">
          <strong>數據庫還沒配置好。</strong>完成下面兩步即可看到文章：
          <br />
          1. 在 Supabase 控制台 SQL Editor 裏運行 <code>supabase/schema.sql</code> 建表；
          <br />
          2. 把 <code>.env.local</code> 裏的 Supabase 三項配置填好，然後重啟 <code>npm run dev</code>。
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="big">空</div>
          還沒有文章。到 <Link href="/admin">後臺</Link> 寫下第一篇吧。
        </div>
      ) : (
        <section className="list" id="posts">
          {posts.map((post, i) => (
            <Link key={post.id} href={`/posts/${post.slug}`} className="item">
              <span className="no">
                {i < CN_NO.length ? CN_NO[i] : String(i + 1).padStart(2, '0')}
              </span>
              <span className="wm" aria-hidden="true">
                {i < CN_WM.length ? CN_WM[i] : ''}
              </span>
              <h2 className="post-title">{post.title}</h2>
              {post.excerpt ? <span className="ex">{post.excerpt}</span> : null}
              <span className="item-foot">
                <span className="date">{formatDate(post.created_at)}</span>
                <span className="read">閱讀全文</span>
              </span>
            </Link>
          ))}
        </section>
      )}

      <footer className="home-footer">
        <div className="footer-line">
          言有盡 · 意無窮 · <Link href="/admin">後臺</Link>
        </div>
        <span className="footer-seal" aria-hidden="true">
          墨
        </span>
      </footer>
    </div>
  )
}
