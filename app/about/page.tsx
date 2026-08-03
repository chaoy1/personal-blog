import Link from 'next/link'
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { SITE_NAME, SITE_DESC, SITE_VERSE } from '@/lib/site'
import ScrollFX from '@/components/ScrollFX'

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

  const rawAvatar = owner?.avatar_url
  const avatar = rawAvatar
    ? rawAvatar.startsWith('http')
      ? rawAvatar
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${rawAvatar}`
    : null

  return (
    <div className="wrap">
      <ScrollFX />
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

        <div className="md-body about-essay">
          {owner?.bio ? (
            owner.bio
              .split(/\n{2,}/)
              .filter(Boolean)
              .map((para, i) => <p key={i}>{para}</p>)
          ) : (
            <>
              <p>
                这里是{SITE_NAME}，{SITE_DESC}。{SITE_VERSE}。
              </p>
              <p>
                这个博客用 Next.js 搭建，文章存在 Supabase，部署在 Vercel——不买服务器、不申请公网
                IP，几分钟就能上线；更新文章只需在后台写一篇 Markdown，前台立刻生效。
              </p>
              <p>
                如果你对这套搭建方式感兴趣，代码开源在 GitHub 上，欢迎看看。
              </p>
            </>
          )}
          <p>
            这个博客欢迎留言。注册一个账号，就可以在文章下面评论、发说说、传照片。
          </p>
        </div>

        {owner ? (
          <aside className="about-colophon">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="about-avatar" src={avatar} alt="博主头像" />
            ) : (
              <span className="about-avatar placeholder">影</span>
            )}
            <div className="about-colophon-info">
              <span className="about-name">{owner.nickname || SITE_NAME}</span>
              <span className="about-role">博主 · {SITE_NAME}</span>
            </div>
          </aside>
        ) : null}
      </article>

      <footer className="article-footer">
        <Link href="/">← 返回首页</Link>
        <Link href="/login">登录 / 注册</Link>
      </footer>
    </div>
  )
}
