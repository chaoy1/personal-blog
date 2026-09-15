import Link from 'next/link'
import type { CSSProperties } from 'react'

import DailyQuote from '@/components/DailyQuote'
import ScrollHint from '@/components/ScrollHint'
import { SITE_DESC, SITE_NAME } from '@/lib/site'

export type HomeHeroProps = {
  postCount: number
  momentCount: number
  photoCount: number
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

      <div className="verse">言有尽而<b>意</b>无穷</div>
      <div className="sigil">笔有止而思无涯</div>

      <section className="home-hero" aria-labelledby="home-title">
        <header className="masthead">
          <p className="eyebrow">留白处自有山河</p>
          <h1 id="home-title">
            <span className="title">
              {SITE_NAME.split('').map((character, index) => (
                <span key={character} className="title-char" style={{ '--i': index } as CSSProperties}>
                  {character}
                </span>
              ))}
            </span>
            <span className="seal" aria-hidden="true">记</span>
          </h1>
          <svg className="stroke" viewBox="0 0 250 28" aria-hidden="true">
            <path d="M4 16 C 42 7, 94 20, 138 12 S 218 7, 246 14" className="stroke-main" strokeWidth={4} fill="none" strokeLinecap="round" opacity="0.78" />
            <path d="M10 21 C 62 15, 124 23, 186 17 S 236 14, 244 17" className="stroke-thin" strokeWidth={1.6} fill="none" strokeLinecap="round" opacity="0.42" />
            <path d="M124 3 C 156 8, 176 10, 204 7" className="stroke-red" strokeWidth={3} fill="none" strokeLinecap="round" opacity="0.55" />
          </svg>
          <p className="lede">{SITE_DESC}。</p>
        </header>

        <nav className="hero-stats" aria-label="站点内容概览">
          <Link href="/posts" className="home-stat-link hs-item button-hit-area"><b>{postCount}</b><i>文章</i></Link>
          <Link href="/moments" className="home-stat-link hs-item button-hit-area"><b>{momentCount}</b><i>闲语</i></Link>
          <Link href="/album" className="home-stat-link hs-item button-hit-area"><b>{photoCount}</b><i>光影</i></Link>
        </nav>

        <DailyQuote />
        <ScrollHint />
      </section>
    </>
  )
}
