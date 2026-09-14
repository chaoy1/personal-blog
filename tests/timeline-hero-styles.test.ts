import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const studioStyles = readFileSync(resolve(process.cwd(), 'app/studio.css'), 'utf8')
const refinementStyles = readFileSync(resolve(process.cwd(), 'app/refinement.css'), 'utf8')

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

function timelineHeroBeforeRules() {
  return Array.from(
    studioStyles.matchAll(
      /([^{}]*\.timeline-page\s*>\s*\.page-intro::before\s*)\{([^{}]*)\}/g,
    ),
    (m) => ({ selector: m[1].trim(), body: m[2] }),
  )
}

function timelineHeroAfterRules() {
  return Array.from(
    studioStyles.matchAll(
      /([^{}]*\.timeline-page\s*>\s*\.page-intro::after\s*)\{([^{}]*)\}/g,
    ),
    (m) => ({ selector: m[1].trim(), body: m[2] }),
  )
}

/**
 * 时间轴题头 · 保持原始山水底图的版面契约。
 *
 * 设计约束：
 * - 题头只保留原始山水底图，避免额外的色差与块感。
 * - 题头不再叠加任何背景光影，避免标题区域形成发光色块。
 * - 伪元素保持禁用状态，原始背景画和题头文字直接共存。
 * - 只作用于 .timeline-page，正文内容区一律不动。
 *
 * 注意：jsdom 对简写属性与伪元素支持不完整，这类断言一律查样式表原文。
 */
function renderTimelineShell() {
  document.head.innerHTML = `
    <style>:root { --card-paper: url("/paper.svg"); --gb-page-paper: #e8dec7; }</style>
    <style>${refinementStyles}</style>
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
  it('removes the timeline background light layer', () => {
    renderTimelineShell()

    // 题头基础规则自己不铺底图，也不留底色
    const introBlock = timelineHeroBlock()
    expect(introBlock).toMatch(/background: none;/)
    expect(introBlock).not.toMatch(/background-image:/)
    expect(introBlock).not.toContain('guestbook-ink-banner')
    const beforeRules = timelineHeroBeforeRules()
    expect(beforeRules.length).toBeGreaterThan(0)
    for (const rule of beforeRules) {
      expect(rule.body).toMatch(/content:\s*none;/)
      expect(rule.body).toMatch(/display:\s*none;/)
      expect(rule.body).not.toContain('radial-gradient')
      expect(rule.body).not.toMatch(/inset:\s*-/)
    }
    for (const rule of timelineHeroAfterRules()) {
      expect(rule.body).toMatch(/content:\s*none;/)
      expect(rule.body).toMatch(/display:\s*none;/)
      expect(rule.body).not.toContain('radial-gradient')
    }
  })

  it('does not restore a pseudo-element inset on the hero edge', () => {
    renderTimelineShell()

    // 父级仍保持开放布局，不需要为光影层预留外扩范围
    expect(getComputedStyle(renderTimelineShell().intro).overflow).toBe('visible')
    for (const rule of timelineHeroBeforeRules()) {
      expect(rule.body).not.toMatch(/inset:\s*-/)
    }
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

    // 时间轴专属伪元素也不得留下椭圆提亮
    const allBefore = Array.from(
      studioStyles.matchAll(/([^{}]*::before\s*)\{([^}]*)\}/g),
      (m) => ({ selector: m[1].trim(), body: m[2] }),
    ).filter((rule) => rule.body.includes('radial-gradient(ellipse'))
    expect(allBefore).toHaveLength(0)
    // 通用 .page-intro 规则里不得挂新的背景层
    const bareIntroLift = allBefore.filter((rule) =>
      /(^|,\s*)\.page-intro::before\s*$/.test(rule.selector),
    )
    expect(bareIntroLift).toHaveLength(0)
  })

  it('keeps the no-light treatment in dark mode', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    renderTimelineShell()

    for (const rule of timelineHeroBeforeRules()) {
      expect(rule.body).toMatch(/content:\s*none;/)
      expect(rule.body).toMatch(/display:\s*none;/)
      expect(rule.body).not.toContain('radial-gradient')
    }
    expect(studioStyles).toMatch(
      /:root\[data-theme='dark'\] \.timeline-page > \.page-intro h1 \{[\s\S]*?color: #f2e8cd;/,
    )
  })

  it('narrows the hero on small screens without restoring the light layer', () => {
    expect(studioStyles).toMatch(
      /@media \(max-width: 720px\) \{[\s\S]*?\.timeline-page > \.page-intro \{[\s\S]*?min-height: 228px;/,
    )
    for (const rule of timelineHeroBeforeRules()) {
      expect(rule.body).not.toMatch(/inset:/)
    }
  })
})
