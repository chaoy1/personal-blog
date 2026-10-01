import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { SITE_NAME } from '@/lib/site'
import { getAboutSections } from '@/lib/about-content'
import ScrollFX from '@/components/ScrollFX'
import MarkdownView from '@/components/MarkdownView'
import { AboutCollectionCard, AboutPortrait } from '@/components/AboutDetails'
import { publicMetadata } from '@/lib/seo'
import ArticleNav from '@/components/ArticleNav'
import './about.css'

export const metadata: Metadata = publicMetadata({
  path: '/about', title: '关于', description: '认识这间记录代码与生活的小屋。',
})
export const revalidate = 60

function Chapter({ id, number, eyebrow, title, mark, children }: { id: string; number: string; eyebrow: string; title: string; mark: string; children: ReactNode }) {
  return (
    <section className={`about-preface-chapter${id === 'encounter' ? ' about-preface-meeting' : ''}`} aria-labelledby={`about-${id}-title`}>
      <header className="about-preface-chapter-head"><span className="about-preface-chapter-number" aria-hidden="true">{number}</span><div><p className="about-preface-eyebrow">{eyebrow}</p><h2 id={`about-${id}-title`}>{title}</h2></div><span className="about-preface-chapter-mark" aria-hidden="true">{mark}</span></header>
      {children}
    </section>
  )
}

export default async function AboutPage() {
  let owner: { nickname: string | null; bio: string | null; avatar_url: string | null } | null = null
  let loadError = false
  try {
    const { data, error } = await supabaseAdmin().from('profiles').select('nickname, bio, avatar_url').eq('role', 'owner').maybeSingle()
    if (error) loadError = true
    else owner = data
  } catch { loadError = true }

  const rawAvatar = owner?.avatar_url?.trim() || ''
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const avatar = rawAvatar ? rawAvatar.startsWith('http') ? rawAvatar : supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/avatars/${rawAvatar}` : null : null
  const profileState = loadError ? 'error' : owner?.bio?.trim() ? 'ready' : 'empty'
  const name = owner?.nickname?.trim() || SITE_NAME
  const sections = getAboutSections(owner?.bio || '')
  const prose = (content: string) => content ? <div className="about-preface-prose"><MarkdownView content={content} preserveParagraphs={sections.preserveParagraphs} /></div> : null

  return (
    <div className="wrap about-page">
      <ScrollFX />
      <ArticleNav current="关于" ariaLabel="关于页导航" />
      <main className="about-preface-paper-sheet" aria-label="关于" data-page-state={profileState} data-profile-state={profileState}>
        <div className="about-preface-paper">
          <header className="about-preface-hero">
            <div className="about-preface-hero-scene" aria-hidden="true" />
            <div className="about-preface-hero-copy"><p className="about-preface-eyebrow"><span>卷 06</span><span>ABOUT / 小序</span></p><h1><span>关于<span className="about-preface-title-tail">这间小屋 <i className="about-preface-seal" aria-hidden="true">记</i></span></span></h1><p className="about-preface-description">写代码，也写生活。</p></div>
            <div className="about-preface-hero-inscription" aria-hidden="true"><span>以文字安放时光<br />于山水之间相逢</span><i>见字<br />如面</i></div>
            <div className="about-preface-hero-foot"><span>一卷自序 · 留给路过的你</span><span>A ROOM FOR WORDS &amp; WANDERINGS</span></div>
          </header>
          <div className={`about-preface-layout${owner ? '' : ' about-preface-without-owner'}`}>
            <article className="about-preface-manuscript">
              <Chapter id="preface" number="壹" eyebrow="PREFACE / 自序" title="小屋里的寻常日子" mark="小序">
                {loadError ? <div className="about-preface-state" role="alert"><p>关于页暂时未能载入。</p><Link href="/about" aria-label="重试关于页">重试关于页</Link></div> : profileState === 'ready' ? prose(sections.preface) : <p className="about-preface-state">这页还没有可展示的自序。</p>}
                {profileState === 'ready' ? <div className="about-preface-margin-note" aria-hidden="true"><span />把寻常，慢慢写成日常。</div> : null}
              </Chapter>
              <Chapter id="traces" number="贰" eyebrow="COLLECTION / 留痕" title="为走过的时间留白" mark="记事">
                {prose(sections.traces)}
                <div className="about-preface-collections" aria-label="小屋里的记录">
                  <AboutCollectionCard href="/posts" accent="#9b4231" tab="文" scene="posts" index="01 / WORDS" title="文章" description="把想明白的，写下来。" action="翻一页" />
                  <AboutCollectionCard href="/moments" accent="#627058" tab="语" scene="moments" index="02 / MOMENTS" title="闲语" description="收下一刻的心绪。" action="读一句" />
                  <AboutCollectionCard href="/album" accent="#86683d" tab="影" scene="photos" index="03 / FRAMES" title="光影" description="将路过的风景珍藏。" action="看一眼" />
                </div>
              </Chapter>
              <Chapter id="encounter" number="叁" eyebrow="ENCOUNTER / 相逢" title="山水有相逢" mark="待续">
                {prose(sections.encounter)}
                <Link className="about-preface-invitation" href="/guestbook"><svg viewBox="0 0 48 32" aria-hidden="true"><path d="M1 1H47V31H1Z M1 31L18 15M47 31L30 15" /><path className="about-preface-flap" d="M1 1L24 19L47 1" /></svg><span><b>去山窗，留一句话。</b><small>见字如面，来信皆收。</small></span><span className="about-preface-invitation-arrow" aria-hidden="true">↗</span></Link>
              </Chapter>
            </article>
            {owner ? <aside className="about-preface-margin" aria-label="博主落款"><div className="about-preface-margin-content"><div className="about-preface-owner-card"><span className="about-preface-owner-pin" aria-hidden="true" /><p className="about-preface-eyebrow">THE ONE BEHIND THE WORDS</p><AboutPortrait key={avatar} src={avatar} name={name} /><h2>{name}</h2><p className="about-preface-owner-role">博主 · {SITE_NAME}</p><div className="about-preface-owner-rule" aria-hidden="true" /><p className="about-preface-owner-motto">写代码，也写生活。<br />让日子有迹可循。</p><div className="about-preface-owner-tail"><span>文字 / 日常 / 风景</span><i aria-hidden="true">记</i></div></div></div></aside> : null}
          </div>
          <footer className="about-preface-colophon" aria-label="关于页落款"><div><span className="about-preface-colophon-label">落款</span>{owner ? <span className="about-preface-signature">{name}</span> : null}<i className="about-preface-seal" aria-hidden="true">自序</i></div><span>写于{SITE_NAME} · 未完待续</span></footer>
        </div>
      </main>
      <footer className="about-preface-site-footer"><p>山水有相逢，来日皆可期。</p></footer>
    </div>
  )
}
