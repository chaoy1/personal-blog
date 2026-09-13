import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const studioStyles = readFileSync(resolve(process.cwd(), 'app/studio.css'), 'utf8')

/**
 * 时间轴题头（岁华叠嶂）的版面契约。
 * 关键点：这版题头只在 .timeline-page 上生效，不能外溢到其他内页。
 *
 * 注意：jsdom 对简写属性（border-radius / background）与 ::after 的支持不完整，
 * 所以凡是简写或伪元素，都改为断言样式表原文；能拿到的长写属性才走计算样式。
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
  it('lays the hero on the site ink painting behind a paper fade, bounded like a scroll', () => {
    renderTimelineShell()

    // 用站点已有的真迹山水压成横带作底，再覆一道上实下虚的纸色渐层
    expect(studioStyles).toMatch(
      /\.timeline-page > \.page-intro \{[\s\S]*?url\("\/bg\/guestbook-ink-banner\.webp"\)/,
    )
    expect(studioStyles).toMatch(
      /\.timeline-page > \.page-intro \{[\s\S]*?rgba\(236, 227, 205, 0\.94\) 0 26%/,
    )
    expect(studioStyles).toMatch(
      /\.timeline-page > \.page-intro \{[\s\S]*?background-position: 0 0, center 72%, 0 0;/,
    )
    // 题头有纸面边界，并与下方时间轴连成一页（简写属性在 jsdom 里读不到，断言原文）
    expect(studioStyles).toMatch(/\.timeline-page > \.page-intro \{[\s\S]*?border-radius: 3px 3px 0 0;/)
    expect(studioStyles).toMatch(
      /\.timeline-page > \.page-intro \+ \.timeline \{[\s\S]*?border-radius: 0 0 3px 3px;/,
    )
    expect(getComputedStyle(renderTimelineShell().intro).overflow).toBe('hidden')
  })

  it('keeps the hero sized for its copy and keeps the seal marker readable', () => {
    const { intro, title, description } = renderTimelineShell()

    expect(getComputedStyle(intro).minHeight).toBe('248px')
    expect(getComputedStyle(intro).display).toBe('grid')
    expect(getComputedStyle(title).fontFamily).toContain('Zhi Mang Xing')
    expect(getComputedStyle(description).fontFamily).toContain('Zhi Mang Xing')
    // 右上纸月（伪元素，断言原文）
    expect(studioStyles).toMatch(
      /\.timeline-page > \.page-intro::after \{[\s\S]*?border-radius: 50%;/,
    )
    // 左侧朱红起笔（伪元素在 jsdom 里读不到，断言原文）
    expect(studioStyles).toMatch(/\.timeline-page > \.page-intro::before \{[\s\S]*?width: 2px;/)
  })

  it('does not leak the timeline hero treatment onto other pages', () => {
    const { otherIntro } = renderTimelineShell()
    const style = getComputedStyle(otherIntro)

    // 其他页面的题头仍是开放式的，不带纸面边界与最小高度
    expect(style.minHeight).toBe('0')
    // 真迹山水只出现在 timeline 专属规则里，不会外溢到其他内页
    const paintingRules = studioStyles.match(/[^{}]*\{[^}]*guestbook-ink-banner[^}]*\}/g) ?? []
    expect(paintingRules.length).toBeGreaterThan(0)
    for (const rule of paintingRules) {
      expect(rule).toContain('.timeline-page')
    }
    // 不应命中任何 timeline 专属规则
    expect(studioStyles).toMatch(/:root\[data-theme='dark'\] \.timeline-page > \.page-intro \{/)
    expect(studioStyles).not.toMatch(/(^|\n)\.page-intro::after \{[^}]*border-radius: 50%;/)
  })

  it('switches the painting to a night treatment in dark mode', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    renderTimelineShell()

    // 夜间纸面转深，真迹改走亮度混合，避免浅调原图在暗底上糊成灰白
    expect(studioStyles).toMatch(
      /:root\[data-theme='dark'\] \.timeline-page > \.page-intro \{[\s\S]*?rgba\(53, 48, 31, 0\.94\)/,
    )
    expect(studioStyles).toMatch(
      /:root\[data-theme='dark'\] \.timeline-page > \.page-intro \{[\s\S]*?background-blend-mode: normal, luminosity, soft-light;/,
    )
  })

  it('narrows the hero on small screens without dropping the painting', () => {
    expect(studioStyles).toMatch(
      /@media \(max-width: 720px\) \{[\s\S]*?\.timeline-page > \.page-intro \{[\s\S]*?min-height: 208px;/,
    )
    expect(studioStyles).toMatch(
      /@media \(max-width: 720px\) \{[\s\S]*?\.timeline-page > \.page-intro \{[\s\S]*?68% 78%/,
    )
  })
})
