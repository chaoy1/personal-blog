import type { Metadata } from 'next'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { SITE_NAME } from '@/lib/site'
import ScrollFX from '@/components/ScrollFX'
import AboutUnfold from '@/components/AboutUnfold'
import MarkdownView from '@/components/MarkdownView'
import Avatar from '@/components/Avatar'
import PageIntro from '@/components/PageIntro'
import { publicMetadata } from '@/lib/seo'
import ArticleNav from '@/components/ArticleNav'

export const metadata: Metadata = publicMetadata({
  path: '/about',
  title: '关于',
  description: '认识这间记录代码与生活的小屋。',
})

export const revalidate = 60

export default async function AboutPage() {
  let owner: { nickname: string | null; bio: string | null; avatar_url: string | null } | null = null
  let loadError = false
  try {
    const { data } = await supabaseAdmin()
      .from('profiles')
      .select('nickname, bio, avatar_url')
      .eq('role', 'owner')
      .maybeSingle()
    owner = data
  } catch {
    loadError = true
  }

  const rawAvatar = owner?.avatar_url?.trim() || ''
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const avatar = rawAvatar
    ? rawAvatar.startsWith('http')
      ? rawAvatar
      : supabaseUrl
        ? `${supabaseUrl}/storage/v1/object/public/avatars/${rawAvatar}`
        : null
    : null
  const profileState = loadError ? 'error' : owner?.bio?.trim() ? 'ready' : 'empty'

  return (
    <div className="wrap about-page">
      <ScrollFX />
      <AboutUnfold />
      <ArticleNav current="关于" ariaLabel="关于页导航" />

      <main
        className="about-scroll"
        aria-label="关于"
        data-page-state={profileState}
        data-profile-state={profileState}
      >
        {/* 纸面单独一层：打开动效靠 clip-path 裁它，硬件才有地方站（见 studio.css） */}
        <div className="about-unfold-paper">
          <PageIntro
            index="06"
            eyebrow="ABOUT"
            title="关于这间小屋"
            seal="记"
            description="写代码，也写生活。"
          />

          <article className="article content-sheet">

          <div className="about-essay">
            {loadError ? (
              <div className="about-state about-state-error" role="alert">
                <p>关于页暂时未能载入。</p>
                <Link className="about-state-link" href="/about" aria-label="重试关于页">重试关于页</Link>
              </div>
            ) : owner?.bio ? (
              <MarkdownView content={owner.bio} preserveParagraphs />
            ) : (
              <p className="about-state about-state-empty">这页还没有可展示的自序。</p>
            )}
          </div>

          {owner ? (
            <aside className="about-colophon about-colophon-casual" aria-label="博主落款">
              <span className="about-colophon-wash" aria-hidden="true" />
              <span className="about-colophon-label" aria-hidden="true">落款</span>
              <span className="about-avatar-wrap">
                <Avatar className="about-avatar" src={avatar} alt="博主头像" />
              </span>
              <div className="about-colophon-info">
                <span className="about-name">{owner.nickname?.trim() || SITE_NAME}</span>
                <span className="about-role">博主 · {SITE_NAME}</span>
              </div>
              <span className="about-colophon-brush" aria-hidden="true" />
              <span className="about-colophon-seal" aria-hidden="true">署</span>
            </aside>
          ) : null}
          </article>
        </div>

        {/* 展立轴硬件：天杆（轴头 + 近端刻线 + 两端丝绦）、卷边、地杆 */}
        <span className="about-unfold-rod" data-rod="top" aria-hidden="true">
          <i className="about-unfold-inlay" data-side="l" />
          <i className="about-unfold-inlay" data-side="r" />
          <i className="about-unfold-cord" data-side="l" />
          <i className="about-unfold-cord" data-side="r" />
        </span>
        <span className="about-unfold-curl" aria-hidden="true" />
        <span className="about-unfold-rod" data-rod="bottom" aria-hidden="true">
          <i className="about-unfold-inlay" data-side="l" />
          <i className="about-unfold-inlay" data-side="r" />
        </span>
      </main>

    </div>
  )
}
