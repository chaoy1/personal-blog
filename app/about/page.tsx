import Link from 'next/link'
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { SITE_NAME } from '@/lib/site'
import ScrollFX from '@/components/ScrollFX'
import MarkdownView from '@/components/MarkdownView'
import Avatar from '@/components/Avatar'

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

        <div className="about-essay">
          {owner?.bio ? <MarkdownView content={owner.bio} /> : null}
        </div>

        {owner ? (
          <aside className="about-colophon">
            <Avatar className="about-avatar" src={avatar} alt="博主头像" />
            <div className="about-colophon-info">
              <span className="about-name">{owner.nickname || SITE_NAME}</span>
              <span className="about-role">博主 · {SITE_NAME}</span>
            </div>
          </aside>
        ) : null}
      </article>

    </div>
  )
}
