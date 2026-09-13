import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const studioStyles = readFileSync(resolve(process.cwd(), 'app/studio.css'), 'utf8')

/**
 * 取出时间轴题头这一段规则的范围。
 * 该选择器在文件里出现三次（旧的夜间基线、本稿桌面、本稿窄屏），
 * 所以用「最后一次桌面出现」到「窄屏出现」之间切片，别用 indexOf 找第一处。
 */
function timelineHeroBlock(): string {
  const hits = Array.from(studioStyles.matchAll(/\.timeline-page > \.page-intro \{/g), (m) => m.index!)
  const desktop = hits[hits.length - 2]
  const mobile = hits[hits.length - 1]
  return studioStyles.slice(desktop, mobile)
}

/**
 * 时间轴题头 · 提亮留白的版面契约。
 *
 * 设计约束（踩过的坑，逐条固化成断言）：
 * - 题头里不能贴任何底图：真迹偏亮，压在深橄榄背景上仍是一块发光的卡片，
 *   色差与"块感"都来自这里。改为在背景画上直接提亮，露出的就是同一张画。
 * - 提亮层必须向外扩出题头、且父级不能裁切；一旦 overflow:hidden，
 *   渐变会被裁成直角，边立刻显形。
 * - 只作用于 .timeline-page，正文内容区一律不动。
 *
 * 注意：jsdom 对简写属性与伪元素支持不完整，这类断言一律查样式表原文。
 */
function renderTimelineShell() {
  document.head.innerHTML = `
    <style>:root { --card-paper: url("/paper.svg"); --gb-page-paper: #e8dec7; }</style>
    <style>${studioStyles}</style>
  `
  document.body.innerHTML = `
    <div class="wrap timeline-page">
      <header class="page-intro">
        <div class="page-intro-copy">
          <div class="page-intro-meta">
            <span class="page-intro-index">卷 04</span>
            <p class="eyebrow">TIMELINE</p>
          </div>
          <h1>时间轴<span class="article-seal">岁</span></h1>
          <p class="page-intro-description">凡 11 事，按时而录。</p>
        </div>
        <span class="page-intro-mark"><i></i>COLLECTED NOTES</span>
      </header>
      <section class="timeline"></section>
    </div>
    <div class="wrap other-page">
      <header class="page-intro"><div class="page-intro-copy"><h1>别的页</h1></div></header>
    </div>
  `
  return {
    intro: document.querySelector<HTMLElement>('.timeline-page > .page-intro')!,
    otherIntro: document.querySelector<HTMLElement>('.other-page > .page-intro')!,
    title: document.querySelector<HTMLElement>('.timeline-page .page-intro h1')!,
    description: document.querySelector<HTMLElement>('.timeline-page .page-intro-description')!,
  }
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('timeline hero composition', () => {
  it('lifts light out of the page painting instead of laying an image on top', () => {
    renderTimelineShell()

    // 题头基础规则自己不铺底图，也不留底色
    const introBlock = timelineHeroBlock()
    expect(introBlock).toMatch(/background: none;/)
    expect(introBlock).not.toMatch(/background-image:/)
    expect(introBlock).not.toContain('guestbook-ink-banner')
    // 提亮来自多层椭圆渐变
    expect(introBlock).toMatch(/::before \{[\s\S]*?radial-gradient\(ellipse/)
  })

  it('lets the lift fade out past the hero edge so no rectangle can show', () => {
    renderTimelineShell()

    // 父级不裁切，提亮层向外扩出，渐变在到边前已全透明
    expect(getComputedStyle(renderTimelineShell().intro).overflow).toBe('visible')
    expect(studioStyles).toMatch(
      /\.timeline-page > \.page-intro::before \{[\s\S]*?inset: -30% -12%;/,
    )
  })

  it('keeps the hero sized for its copy and keeps the vermilion rule', () => {
    const { intro, title, description } = renderTimelineShell()

    expect(getComputedStyle(intro).minHeight).toBe('288px')
    expect(getComputedStyle(intro).display).toBe('grid')
    expect(getComputedStyle(title).fontFamily).toContain('Zhi Mang Xing')
    expect(getComputedStyle(description).fontFamily).toContain('Zhi Mang Xing')
    // 朱红起笔跟着文字走，仍是 2px
    expect(studioStyles).toMatch(
      /\.timeline-page > \.page-intro \.page-intro-copy::before \{[\s\S]*?width: 2px;/,
    )
  })

  it('leaves the timeline content untouched', () => {
    renderTimelineShell()

    // 只改题头：正文内容区不套纸面、不加内边距、不连接成一张纸
    expect(studioStyles).not.toMatch(/\.timeline-page > \.page-intro \+ \.timeline/)
    expect(studioStyles).not.toMatch(/\.timeline-page\s*>\s*\.timeline\s*\{/)
  })

  it('does not leak the timeline hero treatment onto other pages', () => {
    const { otherIntro } = renderTimelineShell()

    // 其他页面的题头仍是开放式的，不带最小高度
    expect(getComputedStyle(otherIntro).minHeight).toBe('0')

    // 提亮层只写在 timeline 专属的 ::before 里，别处不得出现椭圆提亮
    const beforeBlocks = Array.from(
      timelineHeroBlock().matchAll(/([^{}]*::before\s*)\{([^}]*)\}/g),
      (m) => ({ selector: m[1], body: m[2] }),
    ).filter((rule) => rule.body.includes('radial-gradient(ellipse'))
    expect(beforeBlocks.length).toBeGreaterThan(0)
    for (const rule of beforeBlocks) {
      expect(rule.selector).toContain('.timeline-page')
    }
    // 通用 .page-intro 规则里不得挂提亮（只有具体页面可以）
    const allBefore = Array.from(
      studioStyles.matchAll(/([^{}]*::before\s*)\{([^}]*)\}/g),
      (m) => ({ selector: m[1].trim(), body: m[2] }),
    ).filter((rule) => rule.body.includes('radial-gradient(ellipse'))
    const bareIntroLift = allBefore.filter((rule) =>
      /(^|,\s*)\.page-intro::before\s*$/.test(rule.selector),
    )
    expect(bareIntroLift).toHaveLength(0)
  })

  it('swaps the lift to a faint moonlight wash in dark mode', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    renderTimelineShell()

    // 夜间背景画本身已转暗，提亮改为极淡月色，避免在暗底上泛白
    expect(studioStyles).toMatch(
      /:root\[data-theme='dark'\] \.timeline-page > \.page-intro::before \{[\s\S]*?rgba\(226, 216, 178, 0\.14\)/,
    )
    expect(studioStyles).toMatch(
      /:root\[data-theme='dark'\] \.timeline-page > \.page-intro h1 \{[\s\S]*?color: #f2e8cd;/,
    )
  })

  it('narrows the hero on small screens while keeping the lift', () => {
    expect(studioStyles).toMatch(
      /@media \(max-width: 720px\) \{[\s\S]*?\.timeline-page > \.page-intro \{[\s\S]*?min-height: 228px;/,
    )
    expect(studioStyles).toMatch(
      /@media \(max-width: 720px\) \{[\s\S]*?\.timeline-page > \.page-intro::before \{[\s\S]*?inset: -24% -10%;/,
    )
  })
})
