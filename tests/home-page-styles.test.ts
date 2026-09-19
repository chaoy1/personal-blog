import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const readStyles = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')
const globalStyles = readStyles('app/globals.css')
const refinementStyles = readStyles('app/refinement.css')
const studioStyles = readStyles('app/studio.css')
const homeStyles = readStyles('app/home.css')
const heroScrollStyles = readStyles('app/home-hero-scroll.css')
const scrollFxSource = readStyles('components/ScrollFX.tsx')

// jsdom 对 calc() 与自定义属性里的长度支持不全，会让 computed style 出现假象。
// 与基础配方一致，这里只断言「变量名」级别的取值。
function computed(styles: Record<string, string>, property: string) {
  const value = styles[property]
  return typeof value === 'undefined' ? '' : value
}

function renderHomeShell() {
  document.head.innerHTML = `
    <style>${globalStyles}</style>
    <style>${refinementStyles}</style>
    <style>${studioStyles}</style>
    <style>${homeStyles}</style>
    <style>${heroScrollStyles}</style>
  `
  document.body.innerHTML = `
    <div class="bg-painting" aria-hidden="true"></div>
    <div class="bg-blend" aria-hidden="true"></div>
    <main class="wrap home-page">
      <section class="home-hero">
        <div class="inscription left"><div class="inscription-copy">亘古长青意无穷</div></div>
        <div class="inscription right"><div class="inscription-copy">墨有止而意无涯</div></div>
        <header class="masthead">
          <div class="title-landscape" aria-hidden="true"><svg></svg></div>
          <p class="eyebrow">留 白 处 自 有 山 河</p>
          <h1><span class="title">似水流年</span><span class="seal">记</span></h1>
          <div class="motif"></div>
          <p class="lede">记录那些值得被记住的片刻。</p>
        </header>
        <nav class="hero-stats" aria-label="站点内容概览">
          <a class="home-stat-link hs-item button-hit-area"><svg class="ink-ring"></svg><strong class="hs-number">12</strong><span class="hs-label">文章</span><small class="hs-latin">POSTS</small></a>
          <a class="home-stat-link hs-item button-hit-area"><svg class="ink-ring"></svg><strong class="hs-number">4</strong><span class="hs-label">闲语</span><small class="hs-latin">NOTES</small></a>
          <a class="home-stat-link hs-item button-hit-area"><svg class="ink-ring"></svg><strong class="hs-number">8</strong><span class="hs-label">光影</span><small class="hs-latin">FRAMES</small></a>
        </nav>
        <aside class="daily-quote">
          <span class="dq-seal">句</span><p class="dq-text">山水有清音。</p><span class="dq-source">题记</span><button class="dq-shuffle"><svg class="dq-orbit"></svg><span class="dq-shuffle-label">换</span></button>
        </aside>
        <button class="scroll-hint"><span class="sh-copy"><b>走下 · 入卷</b><small>SCROLL TO ENTER</small></span><span class="sh-line"><i /></span></button>
      </section>
      <section class="section section-loose home-section"></section>
    </main>
  `

  return {
    stats: document.querySelector<HTMLElement>('.hero-stats')!,
    statLink: document.querySelector<HTMLElement>('.home-stat-link')!,
    statNumber: document.querySelector<HTMLElement>('.hs-number')!,
    statLabel: document.querySelector<HTMLElement>('.hs-label')!,
    quote: document.querySelector<HTMLElement>('.daily-quote')!,
    shuffle: document.querySelector<HTMLElement>('.dq-shuffle')!,
    hint: document.querySelector<HTMLElement>('.scroll-hint')!,
    section: document.querySelector<HTMLElement>('.home-section')!,
  }
}

beforeEach(() => {
  // 显式要求正常动效：jsdom 默认不匹配 reduce，但别依赖这个默认值。
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('P01 home page recipe', () => {
  it('turns the content statistics into a restrained paper ledger with accessible targets', () => {
    const { stats, statLink, statNumber, statLabel } = renderHomeShell()

    // V2 卷目：三枚目录刻度铺在纸上，不再套一层描边卡片。
    expect(getComputedStyle(stats).borderTopWidth).toBe('0px')
    // 容器收到内容宽度：满宽时透明盒会伸到右侧题签底下。
    expect(getComputedStyle(stats).maxWidth).toBe('760px')
    expect(getComputedStyle(stats).gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))')
    expect(getComputedStyle(statLink).minHeight).toBe('96px')
    expect(getComputedStyle(statNumber).fontSize).toBe('52px')
    expect(getComputedStyle(statLabel).fontSize).toBe('21px')
  })

  it('keeps the quote and scroll affordances compact while preserving 44px controls', () => {
    const { quote, shuffle, hint } = renderHomeShell()

    expect(getComputedStyle(quote).maxWidth).toBe('820px')
    expect(getComputedStyle(quote).borderTopWidth).toBe('0px')
    expect(getComputedStyle(shuffle).minWidth).toBe('46px')
    expect(getComputedStyle(shuffle).minHeight).toBe('46px')
    expect(getComputedStyle(hint).minHeight).toBe('70px')
  })

  it('uses the Phase 1 spacing scale for homepage sections', () => {
    const { section } = renderHomeShell()

    expect(getComputedStyle(section).marginTop).toBe('var(--space-16)')
  })
})

describe('V2 scroll hero recipe', () => {
  const v2Start = heroScrollStyles.indexOf('/* ---------- V2 重排')
  const v2HeroStyles = heroScrollStyles.slice(v2Start)

  it('anchors the hero layers to the full-bleed first-screen canvas', () => {
    const { stats, quote, hint } = renderHomeShell()
    const hero = document.querySelector<HTMLElement>('.home-hero')!
    const masthead = document.querySelector<HTMLElement>('.masthead')!

    // 设计稿是整幅 1440×900 卷首；首屏内容不能继续沿用自然流排版，
    // 否则高屏会全部挤在顶部，矮屏又会把题签和统计推到一起。
    expect(getComputedStyle(hero).display).toBe('block')
    expect(getComputedStyle(hero).paddingTop).toBe('0px')
    expect(getComputedStyle(hero).maxWidth).toBe('none')
    expect(getComputedStyle(masthead).position).toBe('absolute')
    expect(getComputedStyle(stats).position).toBe('absolute')
    expect(getComputedStyle(quote).position).toBe('absolute')
    expect(getComputedStyle(hint).position).toBe('absolute')

    expect(heroScrollStyles).toMatch(
      /\.home-page \.home-hero \.masthead\s*\{[^}]*top:\s*clamp\(104px,\s*13\.55vh,\s*122px\)/,
    )
    expect(heroScrollStyles).toMatch(
      /\.home-page \.home-hero \.hero-stats\s*\{[^}]*top:\s*clamp\(555px,\s*63\.3vh,\s*585px\)/,
    )
    expect(heroScrollStyles).toMatch(
      /\.home-page \.home-hero \.daily-quote\s*\{[^}]*top:\s*clamp\(665px,\s*76\.1vh,\s*700px\)/,
    )
    expect(heroScrollStyles).toMatch(
      /\.home-page \.home-hero \.masthead\s*\{[^}]*transform:\s*translateX\(-50%\) translateY\(var\(--home-hero-scroll-y,\s*0px\)\)/,
    )
    expect(heroScrollStyles).toMatch(
      /\.home-page \.home-hero \.hero-stats,\s*\.home-page \.home-hero \.daily-quote,\s*\.home-page \.home-hero \.scroll-hint\s*\{[^}]*animation:\s*hero-ink-in/,
    )
    expect(scrollFxSource).toContain("masthead.style.setProperty('--home-hero-scroll-y'")
    expect(scrollFxSource).not.toContain('masthead.style.transform =')
  })

  it('keeps dust and stars out of the curated hero while the maple leaves keep falling', () => {
    renderHomeShell()

    expect(heroScrollStyles).toMatch(/\.home-page\s*>\s*\.branch\s*\{[^}]*display:\s*none/)
    expect(heroScrollStyles).toMatch(
      /:root:has\(\.home-page\) \.bg-canvas-dust,\s*:root:has\(\.home-page\) \.bg-canvas-stars\s*\{[^}]*display:\s*none/,
    )
    // 枫叶层不能再被整类关掉。
    expect(heroScrollStyles).not.toMatch(/:root:has\(\.home-page\) \.bg-canvas\s*\{[^}]*display:\s*none/)
    expect(heroScrollStyles).toMatch(/:root:has\(\.home-page\) \.vignette\s*\{[^}]*animation:\s*none/)
    expect(heroScrollStyles).toMatch(/:root:has\(\.home-page\) \.bg-blend\s*\{[^}]*mix-blend-mode:\s*normal/)
  })

  it('subordinates the source painting to the warm title-area landscape wash', () => {
    const { painting, blend } = (() => {
      renderHomeShell()
      return {
        painting: document.querySelector<HTMLElement>('.bg-painting')!,
        blend: document.querySelector<HTMLElement>('.bg-blend')!,
      }
    })()

    expect(getComputedStyle(painting).filter).toBe('var(--hero-bg-filter)')
    expect(getComputedStyle(blend).background).toContain('var(--hero-bg-wash)')
    expect(heroScrollStyles).toMatch(
      /:root:has\(\.home-page\)\s*\{[^}]*--hero-bg-filter:\s*brightness\(1\.03\) saturate\(0\.84\) contrast\(0\.98\)/,
    )
    expect(heroScrollStyles).toMatch(
      /:root:has\(\.home-page\)\s*\{[^}]*--hero-bg-wash:\s*rgba\(242, 231, 197, 0\.54\)/,
    )
    expect(heroScrollStyles).toMatch(
      /:root:has\(\.home-page\)\s*\{[^}]*--hero-bg-edge-wash:\s*rgba\(242, 231, 197, 0\.32\)/,
    )
    expect(heroScrollStyles).toMatch(
      /radial-gradient\(ellipse 56% 44% at 50% 30%,\s*var\(--hero-bg-wash\),\s*transparent 76%\)/,
    )
    expect(heroScrollStyles).toMatch(
      /:root:has\(\.home-page\) \.bg-blend::before\s*\{[^}]*background:/,
    )
    expect(heroScrollStyles).toMatch(
      /:root:has\(\.home-page\) \.bg-blend::before\s*\{[^}]*mask-image:\s*linear-gradient\(180deg,\s*#000 0%,\s*#000 68%,\s*transparent 92%\)/,
    )
    expect(heroScrollStyles).toMatch(
      /:root\[data-theme='dark'\]:has\(\.home-page\)\s*\{[^}]*--hero-bg-filter:\s*brightness\(0\.78\) saturate\(0\.64\) contrast\(0\.98\)/,
    )
  })

  it('keeps the landscape wash as the deepest layer of the masthead', () => {
    renderHomeShell()
    const landscape = document.querySelector<HTMLElement>('.title-landscape')!

    // 远山压在最底层，柔光在其上、文字在最上，三层互不吞没。
    expect(getComputedStyle(landscape).zIndex).toBe('-1')
    expect(getComputedStyle(landscape).mixBlendMode).toBe('multiply')
    expect(getComputedStyle(landscape).pointerEvents).toBe('none')
  })

  it('leaves the rotated corner index out of the hero, where the painting hides it', () => {
    renderHomeShell()

    expect(getComputedStyle(document.querySelector<HTMLElement>('.home-hero')!).overflow).toBe('clip')
    expect(heroScrollStyles).toMatch(/\.corner-index\s*\{[^}]*display:\s*none/)
  })

  it('declares token-driven dark-theme counterparts instead of hard-coded light ink', () => {
    expect(heroScrollStyles).toMatch(/:root\[data-theme='dark'\][^{]*\{[^}]*--hero-stroke-strong/)
    expect(heroScrollStyles).not.toMatch(/#a93225|#e8ddbd|#202720/)
  })

  it('scopes every rule to the home page so no other page inherits the recipe', () => {
    // 取每个声明块前的选择器：出现在 `{` 之前的最后一段文本。
    const selectors = [...heroScrollStyles.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)]
      .map((match) => match[1].trim())
      // 声明块内部的属性、at-rule 前奏与 keyframes 关键帧不是选择器。
      .filter((value) => value.length > 0 && !value.startsWith('@') && !value.includes(':'))
      .filter((value) => value !== 'from' && value !== 'to' && !value.endsWith('%'))

    expect(selectors.length).toBeGreaterThan(20)
    // 只允许三类首页级例外：首屏自身、以及两个由 AppShell 挂在 <main> 外的护字层。
    const pageLevel = new Set([
      '.home-page',
      '.home-page .bg-tint',
      '.home-page .bg-blend',
      '.home-page > .branch',
      ':root:has(.home-page) .bg-painting',
      ':root:has(.home-page) .bg-blend',
      ':root:has(.home-page) .bg-tint',
      ':root:has(.home-page) .bg-canvas-dust',
      ':root:has(.home-page) .bg-canvas-stars',
      ':root:has(.home-page) .vignette',
      ':root:has(.home-page) .grain',
    ])
    for (const selector of selectors) {
      for (const part of selector.split(',').map((value) => value.trim()).filter(Boolean)) {
        if (pageLevel.has(part)) continue
        expect(part, `unscoped selector: ${part}`).toMatch(/^\.home-page \.home-hero\b/)
      }
    }

    // 背部山水是 <main> 的兄弟节点，只能用 :has() 从根节点限定到首页。
    const backgroundSelectors = [
      ...heroScrollStyles
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .matchAll(/([^{}]+)\{[^}]*hero-wash-in/g),
    ].map((match) => match[1].trim())

    expect(backgroundSelectors).toHaveLength(1)
    for (const part of backgroundSelectors[0].split(',').map((value) => value.trim())) {
      expect(part).toMatch(/^:root:has\(\.home-page\)/)
    }
  })

  it('collapses the side inscriptions before they can crowd the centred title', () => {
    expect(heroScrollStyles).toMatch(/@media \(max-width: 980px\)[\s\S]*\.inscription\s*\{[^}]*display:\s*none/)
  })

  /*
   * 设计稿把题签钉在 1440×900 画布上，和统计数据不在同一条水平带里。
   * 曾经把题签挂到 hero 盒子里，矮屏上它随盒子下移，直接压在三枚卷目上。
   */
  it('anchors the inscriptions to the same band as the title, never down onto the catalog', () => {
    renderHomeShell()
    const left = document.querySelector<HTMLElement>('.inscription.left')!
    const right = document.querySelector<HTMLElement>('.inscription.right')!

    expect(getComputedStyle(left).position).toBe('absolute')
    expect(getComputedStyle(right).position).toBe('absolute')
    // AppShell 的导航在 hero 外部；这里直接沿用设计稿相对于 hero 的画布坐标。
    expect(computed({ top: getComputedStyle(left).top }, 'top')).toBe('132px')
    expect(computed({ top: getComputedStyle(right).top }, 'top')).toBe('212px')
  })

  it('makes the hero fill the whole first screen instead of hugging its content', () => {
    renderHomeShell()
    const hero = document.querySelector<HTMLElement>('.home-hero')!

    // 首屏吃满导航以下的一屏，多余空间由上下 auto 外边距平分。
    expect(heroScrollStyles).toMatch(/min-height:\s*max\(800px,\s*calc\(100svh - var\(--nav-h\)\)\)/)
    expect(heroScrollStyles).toMatch(/min-height:\s*max\(800px,\s*calc\(100dvh - var\(--nav-h\)\)\)/)
    // 首屏自己承担上边距，导航与画卷之间不再留一段空纸。
    expect(heroScrollStyles).toMatch(/\.home-page\s*\{[^}]*--wrap-pt:\s*0px/)
    // V2 下滑入口由最终画布规则钉在首屏底部，不能退回旧的自然流 auto 外边距。
    expect(v2HeroStyles).toMatch(
      /\.home-page \.home-hero \.scroll-hint\s*\{[^}]*position:\s*absolute[^}]*bottom:\s*3px[^}]*margin:\s*0/,
    )
    expect(getComputedStyle(hero).overflow).toBe('clip')
    // 内容高于视口时不能被裁掉：高度是下限而不是定值。
    expect(v2Start).toBeGreaterThan(-1)
    expect(v2HeroStyles).toMatch(/\.home-page \.home-hero \{[^}]*min-height: max\(800px,\s*calc\(100svh - var\(--nav-h\)\)\)/)
    expect(v2HeroStyles).toMatch(
      /@media \(max-width:\s*720px\)[\s\S]*?\.home-page \.home-hero\s*\{[^}]*min-height:\s*max\(720px,\s*calc\(100dvh - var\(--nav-h\)\)\)/,
    )
    expect(v2HeroStyles.indexOf('@media (max-width: 720px)')).toBeGreaterThan(
      v2HeroStyles.indexOf('min-height: max(800px'),
    )
    expect(heroScrollStyles).not.toMatch(/\n\s*height: calc\(100(svh|dvh)/)
  })

  it('keeps the title stack breathable instead of shrinking it into short desktop viewports', () => {
    expect(heroScrollStyles).toMatch(
      /\.home-page \.home-hero \.eyebrow\s*\{[^}]*margin:\s*0 auto 96px/,
    )
    expect(heroScrollStyles).toMatch(
      /\.home-page \.home-hero \.motif\s*\{[^}]*margin:\s*110px auto 2px/,
    )
    expect(heroScrollStyles).toMatch(
      /\.home-page \.home-hero \.lede\s*\{[^}]*margin-top:\s*8px/,
    )
    expect(heroScrollStyles).not.toMatch(/@media \(max-height:\s*680px\)[\s\S]*?\.home-page \.home-hero \.title\s*\{/)
    expect(v2HeroStyles).toMatch(
      /@media \(max-height:\s*820px\) and \(min-width:\s*721px\)[\s\S]*?\.eyebrow\s*\{[^}]*margin-bottom:\s*80px[^}]*\}[\s\S]*?\.motif\s*\{[^}]*margin:\s*94px auto 2px[^}]*\}[\s\S]*?\.hero-stats\s*\{[^}]*top:\s*525px[^}]*\}[\s\S]*?\.daily-quote\s*\{[^}]*top:\s*640px/,
    )
  })

  it('brings the background and every hero layer in one after another', () => {
    const staged: Array<[string, string]> = [
      [':root:has(.home-page) .bg-painting', 'hero-wash-in'],
      ['.home-page .home-hero .title-landscape', 'hero-far-in'],
      ['.home-page .home-hero .inscription', 'hero-inscription-in'],
      ['.home-page .home-hero .motif', 'hero-motif-in'],
    ]

    // 新加的三层必须自己带入场，否则会整块硬闪出来。
    for (const [selector, animation] of staged) {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      expect(heroScrollStyles, `missing staged animation for ${selector}`).toMatch(
        new RegExp(`${escaped}\\s*\\{[^}]*animation:\\s*${animation}`),
      )
    }

    // 尾部三个区块原本各等 1.6s／1.8s／2s，统一压紧。
    expect(heroScrollStyles).toMatch(/\.home-hero \.lede[\s\S]*?animation-duration:\s*1\.05s/)
    expect(heroScrollStyles).toMatch(/\.scroll-hint\s*\{[^}]*animation-duration:\s*1\.15s/)
  })

  it('drops every entrance animation when motion is reduced', () => {
    const reducedMotion = heroScrollStyles.split('@media (prefers-reduced-motion: reduce)').pop()!

    // 取消动画但不动 transform —— 远山要靠 translateX(-50%) 居中。
    for (const selector of ['.eyebrow', '.title-landscape', '.inscription', '.motif', '.hero-stats', '.daily-quote']) {
      expect(reducedMotion).toContain(selector)
    }
    expect(reducedMotion).toMatch(/animation:\s*none/)
    expect(reducedMotion).not.toMatch(/\.title-landscape[^{]*\{[^}]*transform/)
  })

  it('keeps the quote text column capped so the source stays beside the verse', () => {
    const { quote, shuffle } = renderHomeShell()

    // 引文列若用 1fr，容器变宽会把出处推到天边；换句按钮独立钉在纸带右端。
    expect(getComputedStyle(quote).gridTemplateColumns).toBe('46px minmax(0, 410px) auto')
    expect(getComputedStyle(shuffle).position).toBe('absolute')
    expect(getComputedStyle(quote).maxWidth).toBe('820px')
    expect(heroScrollStyles).toMatch(
      /\.home-page \.home-hero \.daily-quote\s*\{[^}]*left:\s*48%/,
    )
    expect(heroScrollStyles).toMatch(
      /\.home-page \.home-hero \.dq-shuffle\s*\{[^}]*position:\s*absolute[^}]*top:\s*50%[^}]*right:\s*34px/,
    )
  })

  it('keeps the quote switch inside the right edge on narrow screens', () => {
    expect(heroScrollStyles).toMatch(
      /@media \(max-width:\s*720px\)[\s\S]*?\.home-page \.home-hero \.daily-quote\s*\{[^}]*padding-right:\s*64px/,
    )
    expect(heroScrollStyles).toMatch(
      /@media \(max-width:\s*720px\)[\s\S]*?\.home-page \.home-hero \.dq-shuffle\s*\{[^}]*right:\s*10px/,
    )
  })
})
