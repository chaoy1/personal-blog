import Link from 'next/link'
import type { Metadata } from 'next'
import { SITE_NAME, SITE_DESC, SITE_VERSE } from '@/lib/site'

export const metadata: Metadata = {
  title: '關於',
}

export default function AboutPage() {
  return (
    <div className="wrap">
      <nav className="article-nav">
        <Link href="/">← 返回首頁</Link>
        <span>{SITE_NAME}</span>
      </nav>

      <article className="article">
        <p className="eyebrow">ABOUT</p>
        <h1>
          關於這間小屋
          <span className="article-seal" aria-hidden="true">
            記
          </span>
        </h1>
        <div className="divider-ornament" aria-hidden="true">
          ※ ※ ※
        </div>
        <div className="md-body">
          <p>
            這裡是{SITE_NAME}，{SITE_DESC}。{SITE_VERSE}。
          </p>
          <p>
            這個博客用 Next.js 搭建，文章存在 Supabase，部署在 Vercel——不買服務器、不申請公網 IP，幾分鐘就能上線；更新文章只需在後臺寫一篇 Markdown，前台立刻生效。
          </p>
          <p>
            如果你對這套搭建方式感興趣，代碼開源在 GitHub 上，歡迎看看。
          </p>
        </div>
      </article>

      <footer className="article-footer">
        <Link href="/">← 返回首頁</Link>
        <a href="https://github.com/chaoy1/personal-blog" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  )
}
