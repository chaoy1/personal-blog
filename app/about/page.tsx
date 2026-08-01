import Link from 'next/link'
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { SITE_NAME, SITE_DESC, SITE_VERSE } from '@/lib/site'

export const metadata: Metadata = {
  title: '關於',
}

export default async function AboutPage() {
  let owner: { nickname: string; bio: string; avatar_url: string } | null = null
  try {
    const { data } = await supabaseAdmin()
      .from('profiles')
      .select('nickname, bio, avatar_url')
      .eq('role', 'owner')
      .maybeSingle()
    owner = data
  } catch {
    // 数据库未初始化等
  }

  const avatarUrl = owner?.avatar_url
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${owner.avatar_url}`
    : null

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

        {owner ? (
          <div className="about-owner">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="about-avatar" src={avatarUrl} alt="博主頭像" />
            ) : (
              <span className="about-avatar placeholder">影</span>
            )}
            <div>
              <h2 className="about-name">{owner.nickname || SITE_NAME}</h2>
              {owner.bio ? <p className="about-bio">{owner.bio}</p> : null}
            </div>
          </div>
        ) : (
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
        )}

        <div className="md-body">
          <p>
            這個博客歡迎留言。註冊一個賬號，就可以在文章下面評論、發說說、傳照片。
          </p>
        </div>
      </article>

      <footer className="article-footer">
        <Link href="/">← 返回首頁</Link>
        <Link href="/login">登錄 / 註冊</Link>
      </footer>
    </div>
  )
}
