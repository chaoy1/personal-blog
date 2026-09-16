import Link from 'next/link'
import type { CSSProperties } from 'react'

import DailyQuote from '@/components/DailyQuote'
import ScrollHint from '@/components/ScrollHint'
import HomeInscription from '@/components/home/HomeInscription'
import Motif from '@/components/home/Motif'
import TitleLandscape from '@/components/home/TitleLandscape'
import { SITE_NAME, SITE_VERSE } from '@/lib/site'

export type HomeHeroProps = {
  postCount: number
  momentCount: number
  photoCount: number
}

/** 三枚卷目共用一份外框，只有数字、名称与英文标注不同。 */
function HeroStat({
  href,
  count,
  label,
  latin,
}: {
  href: string
  count: number
  label: string
  latin: string
}) {
  return (
    <Link href={href} className="home-stat-link hs-item button-hit-area">
      <svg className="ink-ring" viewBox="0 0 136 90" preserveAspectRatio="none" aria-hidden="true">
        <path d="M127 45C127 69 104 84 67 84S9 69 9 45 31 7 68 7s59 14 59 38Z" />
      </svg>
      <strong className="hs-number">{count}</strong>
      <span className="hs-label">{label}</span>
      <small className="hs-latin">{latin}</small>
    </Link>
  )
}

function TitleChars({ children }: { children: string }) {
  return (
    <>
      {children.split('').map((character, index) => (
        <span key={`${character}-${index}`} className="title-char" style={{ '--i': index } as CSSProperties}>
          {character}
        </span>
      ))}
    </>
  )
}

export default function HomeHero({ postCount, momentCount, photoCount }: HomeHeroProps) {
  return (
    <>
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

      <section className="home-hero" aria-labelledby="home-title">
        <HomeInscription side="left" text="亘古长青意无穷" seal="青" note="LEFT INSCRIPTION · 01" />
        <HomeInscription side="right" text="墨有止而意无涯" seal="墨" note="RIGHT INSCRIPTION · 02" />

        <header className="masthead">
          <TitleLandscape />
          <p className="eyebrow">留 白 处 自 有 山 河</p>
          <h1 id="home-title">
            <span className="title">
              <TitleChars>{SITE_NAME}</TitleChars>
            </span>
            <span className="seal" aria-hidden="true">
              记
            </span>
          </h1>
          <Motif />
          <p className="lede">{SITE_VERSE}。</p>
        </header>

        <nav className="hero-stats" aria-label="站点内容概览">
          <HeroStat href="/posts" count={postCount} label="文章" latin="POSTS" />
          <HeroStat href="/moments" count={momentCount} label="闲语" latin="NOTES" />
          <HeroStat href="/album" count={photoCount} label="光影" latin="FRAMES" />
        </nav>

        <DailyQuote />
        <ScrollHint />
      </section>
    </>
  )
}
