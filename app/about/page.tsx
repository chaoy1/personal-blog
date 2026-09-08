import Link from 'next/link'
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { SITE_NAME } from '@/lib/site'
import ScrollFX from '@/components/ScrollFX'
import MarkdownView from '@/components/MarkdownView'
import Avatar from '@/components/Avatar'
import PageIntro from '@/components/PageIntro'
import { publicMetadata } from '@/lib/seo'

export const metadata: Metadata = publicMetadata({
  path: '/about',
  title: '关于',
  description: '认识这间记录代码与生活的小屋。',
})

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
    <div className="wrap about-page">
      <ScrollFX />
      <nav className="article-nav">
        <Link href="/"><span className="nav-back-mark" aria-hidden="true" />返回首页</Link>
        <span>关于</span>
      </nav>

      <main className="about-scroll">
        <PageIntro
          index="06"
          eyebrow="ABOUT"
          title="关于这间小屋"
          seal="记"
          description="写代码，也写生活。"
        />

        <article className="article content-sheet">

        <div className="about-essay">
          {owner?.bio ? <MarkdownView content={owner.bio} preserveParagraphs /> : null}
        </div>

        {owner ? (
          <aside className="about-colophon about-colophon-casual" aria-label="博主落款">
            <span className="about-colophon-label" aria-hidden="true">落款</span>
            <span className="about-avatar-wrap">
              <Avatar className="about-avatar" src={avatar} alt="博主头像" />
            </span>
            <div className="about-colophon-info">
              <span className="about-name">{owner.nickname || SITE_NAME}</span>
              <span className="about-role">博主 · {SITE_NAME}</span>
            </div>
            <span className="about-colophon-brush" aria-hidden="true" />
            <span className="about-colophon-seal" aria-hidden="true">署</span>
          </aside>
        ) : null}
        </article>
      </main>

    </div>
  )
}
