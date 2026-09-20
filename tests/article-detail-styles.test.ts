import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const readStyles = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

function renderArticleShell() {
  document.head.innerHTML = `
    <style>${readStyles('app/globals.css')}</style>
    <style>${readStyles('app/refinement.css')}</style>
    <style>${readStyles('app/studio.css')}</style>
    <style>${readStyles('app/posts/article-detail.css')}</style>
  `
  document.body.innerHTML = `
    <main class="wrap article-wrap">
      <article class="art-sheet">
        <div class="art-sheet-edge"></div>
        <header class="art-hero">
          <div class="art-hero-copy"><h1 class="art-title"><span class="art-title-brush">写点什么，</span><span class="art-title-line">比写得完美更重要</span></h1></div>
        </header>
        <div class="art-body">
          <div class="art-reading">
            <div class="art-prose">
              <div class="md-body">
                <p>正文</p>
                <div class="md-table-wrap" role="region"><table><tbody><tr><td>表格</td></tr></tbody></table></div>
                <pre><code>const path = '山路'</code></pre>
                <img src="/bridge.jpg" alt="桥" />
              </div>
            </div>
            <div class="reading-companion-rail"><aside class="reading-companion"></aside></div>
            <details class="reading-companion-compact"><summary>卷内目录</summary></details>
          </div>
          <section class="art-afterword"></section>
          <footer class="art-colophon"></footer>
        </div>
      </article>
    </main>
  `

  return {
    sheet: document.querySelector<HTMLElement>('.art-sheet')!,
    artBody: document.querySelector<HTMLElement>('.art-body')!,
    reading: document.querySelector<HTMLElement>('.art-reading')!,
    rail: document.querySelector<HTMLElement>('.reading-companion-rail')!,
    companion: document.querySelector<HTMLElement>('.reading-companion')!,
    body: document.querySelector<HTMLElement>('.md-body')!,
    table: document.querySelector<HTMLElement>('.md-table-wrap')!,
    pre: document.querySelector<HTMLElement>('pre')!,
    image: document.querySelector<HTMLImageElement>('img')!,
  }
}

const articleStyles = () => readStyles('app/posts/article-detail.css')

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('P03 reading layout recipe（对齐设计稿 article-xuan-reading.html）', () => {
  it('keeps the paper at the design width with a fixed reading measure', () => {
    const { body } = renderArticleShell()
    const css = articleStyles()

    // 设计稿 .page-shell / .prose：纸面 1120，正文栏上限 730（列宽由纸内网格决定）。
    expect(css).toContain('width: min(1120px, calc(100% - 104px))')
    expect(getComputedStyle(body).maxWidth).toBe('730px')
  })

  it('lays the reading area out as prose column + in-paper margin column', () => {
    const { reading, rail } = renderArticleShell()
    const css = articleStyles()

    expect(getComputedStyle(reading).display).toBe('grid')
    // jsdom 不解析 var()/简写，这里核对声明本身 + token 取值（设计稿：225 / 78）。
    expect(getComputedStyle(reading).gridTemplateColumns).toContain('var(--art-rail-width)')
    expect(css).toMatch(/\.art-reading \{[\s\S]*?gap: var\(--art-rail-gap\)/)
    expect(css).toContain('--art-rail-width: 225px')
    expect(css).toContain('--art-rail-gap: 78px')
    // 批注栏在纸内右侧（设计稿 .margin-note），窄屏才收起。
    expect(getComputedStyle(rail).position).toBe('absolute')
    expect(css).toMatch(/@media \(max-width: 850px\) \{[\s\S]*?\.reading-companion-rail \{\s*display: none/)
    expect(css).toMatch(/@media \(max-width: 850px\) \{[\s\S]*?\.reading-companion-compact \{\s*display: block/)
  })

  it('anchors the rail to the whole article body so the directory never scrolls away', () => {
    const { artBody, reading, rail, companion } = renderArticleShell()
    const css = articleStyles()

    // 轨道是绝对定位，包含块必须是 .art-body（正文 + 卷尾 + 推荐 + 评论 + 落款），
    // 吸附范围才等于整张纸；.art-reading 一旦是定位元素就会把轨道截在正文那一段。
    expect(getComputedStyle(artBody).position).toBe('relative')
    expect(getComputedStyle(reading).position).not.toMatch(/relative|absolute|fixed|sticky/)
    expect(rail.closest('.art-body')).not.toBeNull()
    expect(getComputedStyle(companion).position).toBe('sticky')
    // globals 里还留着纸外悬浮版的 left，这里必须显式 left: auto。
    expect(css).toMatch(/\.reading-companion-rail \{[\s\S]*?left: auto;[\s\S]*?right: var\(--art-rail-inset\)/)
  })

  it('contains wide media inside the paper and gives tables their own scroll region', () => {
    const { table, pre, image } = renderArticleShell()

    expect(getComputedStyle(table).overflowX).toBe('auto')
    expect(getComputedStyle(pre).overflowX).toBe('auto')
    expect(getComputedStyle(image).maxWidth).toBe('100%')
  })
})
