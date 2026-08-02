import Link from 'next/link'
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { SITE_NAME, SITE_DESC, SITE_VERSE } from '@/lib/site'

export const metadata: Metadata = {
  title: '关于',
}

export const revalidate = 60

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
        <Link href="/">← 返回首页</Link>
        <span>{SITE_NAME}</span>
      </nav>

      <article className="article">
        <p className="eyebrow">ABOUT</p>
        <h1>
          关于这间小屋
          <span className="article-seal" aria-hidden="true">
            记
          </span>
        </h1>
        <div className="divider-ornament" aria-hidden="true">
          ※ ※ ※
        </div>

        {owner ? (
          <div className="about-owner">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="about-avatar" src={avatarUrl} alt="博主头像" />
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
              这里是{SITE_NAME}，{SITE_DESC}。{SITE_VERSE}。
            </p>
            <p>
              这个博客用 Next.js 搭建，文章存在 Supabase，部署在 Vercel——不买服务器、不申请公网 IP，几分钟就能上线；更新文章只需在后台写一篇 Markdown，前台立刻生效。
            </p>
            <p>
              如果你对这套搭建方式感兴趣，代码开源在 GitHub 上，欢迎看看。
            </p>
          </div>
        )}

        <div className="md-body">
          <p>
            这个博客欢迎留言。注册一个账号，就可以在文章下面评论、发说说、传照片。
          </p>
        </div>
      </article>

      <footer className="article-footer">
        <Link href="/">← 返回首页</Link>
        <Link href="/login">登录 / 注册</Link>
      </footer>
    </div>
  )
}
