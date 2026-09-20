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

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('P03 reading layout recipe', () => {
  it('keeps the paper on the shared inner-page width with a fixed reading measure', () => {
    const { reading, body } = renderArticleShell()

    // 纸面取内页标准宽度（--container-page），阅读行宽固定，两者互不牵连。
    const css = readFileSync(resolve(process.cwd(), 'app/posts/article-detail.css'), 'utf8')
    expect(css).toContain('width: min(var(--container-page), 100%)')
    expect(getComputedStyle(body).maxWidth).toBe('730px')
    // 纵向 flex 列：卷内目录入口靠 order: -1 落在正文之前。
    expect(getComputedStyle(reading).display).toBe('flex')
    expect(getComputedStyle(reading).flexDirection).toBe('column')
  })

  it('floats the annotation rail outside the paper and falls back to the compact directory', () => {
    const { rail } = renderArticleShell()

    // 纸面收窄后纸内放不下整轨：轨道移到纸外，默认收起，
    // 只在宽屏（>=1320px）显示，窄屏用卷内目录入口。
    const css = readFileSync(resolve(process.cwd(), 'app/posts/article-detail.css'), 'utf8')
    expect(getComputedStyle(rail).position).toBe('absolute')
    expect(getComputedStyle(rail).display).toBe('none')
    expect(css).toMatch(/@media \(min-width: 1320px\) \{[\s\S]*?\.reading-companion-rail \{\s*display: block/)
  })

  it('anchors the rail to the whole article body so the directory never scrolls away', () => {
    const { artBody, reading, rail, companion } = renderArticleShell()

    // 轨道是绝对定位，它的包含块必须是 .art-body（正文 + 卷尾 + 推荐 + 评论 + 落款），
    // 吸附范围才等于整张纸；.art-reading 一旦是定位元素就会把轨道截在正文那一段。
    expect(getComputedStyle(artBody).position).toBe('relative')
    // jsdom 对未声明的 position 返回空串，所以断言「不是任何定位值」。
    expect(getComputedStyle(reading).position).not.toMatch(/relative|absolute|fixed|sticky/)
    expect(reading.parentElement?.classList.contains('art-body')).toBe(true)
    expect(rail.closest('.art-body')).not.toBeNull()
    expect(getComputedStyle(companion).position).toBe('sticky')
  })

  it('contains wide media inside the paper and gives tables their own scroll region', () => {
    const { table, pre, image } = renderArticleShell()

    expect(getComputedStyle(table).overflowX).toBe('auto')
    expect(getComputedStyle(pre).overflowX).toBe('auto')
    expect(getComputedStyle(image).maxWidth).toBe('100%')
  })
})
