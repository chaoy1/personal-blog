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
      </article>
    </main>
  `

  return {
    sheet: document.querySelector<HTMLElement>('.art-sheet')!,
    reading: document.querySelector<HTMLElement>('.art-reading')!,
    rail: document.querySelector<HTMLElement>('.reading-companion-rail')!,
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
  it('keeps the paper, the readable measure and the annotation rail in one sheet', () => {
    const { reading, rail, body } = renderArticleShell()

    // 宣纸宽度可伸展，阅读行宽固定；批注轨是纸面内的第二栏。
    expect(getComputedStyle(body).maxWidth).toBe('730px')
    expect(getComputedStyle(reading).display).toBe('grid')
    expect(getComputedStyle(reading).gridTemplateColumns).toContain('225px')
    expect(rail.parentElement?.classList.contains('art-reading')).toBe(true)
  })

  it('keeps the annotation rail inside the sheet instead of floating outside it', () => {
    const { rail } = renderArticleShell()

    // globals.css 里旧的悬浮轨道规则必须被纸面配方覆盖。
    expect(getComputedStyle(rail).position).toBe('static')
  })

  it('contains wide media inside the paper and gives tables their own scroll region', () => {
    const { table, pre, image } = renderArticleShell()

    expect(getComputedStyle(table).overflowX).toBe('auto')
    expect(getComputedStyle(pre).overflowX).toBe('auto')
    expect(getComputedStyle(image).maxWidth).toBe('100%')
  })
})
