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
      <div class="article-reading-shell">
        <article class="article">
          <header class="article-header"><h1>一篇很长的手记</h1></header>
          <div class="md-body">
            <p>正文</p>
            <div class="md-table-wrap" role="region"><table><tbody><tr><td>表格</td></tr></tbody></table></div>
            <pre><code>const path = '山路'</code></pre>
            <img src="/bridge.jpg" alt="桥" />
          </div>
        </article>
        <div class="reading-companion-rail"><aside class="reading-companion"></aside></div>
      </div>
    </main>
  `

  return {
    article: document.querySelector<HTMLElement>('.article')!,
    body: document.querySelector<HTMLElement>('.md-body')!,
    table: document.querySelector<HTMLElement>('.md-table-wrap')!,
    pre: document.querySelector<HTMLElement>('pre')!,
    image: document.querySelector<HTMLImageElement>('img')!,
    rail: document.querySelector<HTMLElement>('.reading-companion-rail')!,
    companion: document.querySelector<HTMLElement>('.reading-companion')!,
  }
}

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('P03 reading layout recipe', () => {
  it('keeps the paper and readable text measure distinct', () => {
    const { article, body } = renderArticleShell()

    expect(getComputedStyle(article).maxWidth).toBe('780px')
    expect(getComputedStyle(body).maxWidth).toBe('680px')
  })

  it('pins the directory on the grid column so it stays on screen for the whole page', () => {
    const { rail, companion } = renderArticleShell()

    // 吸附必须写在网格栏上：栏的高度等于纸面高度（正文 + 评论 + 推荐），
    // 栏内的卡片跟栏一样高是没有吸附余量的，目录会跟着页面滚走。
    expect(getComputedStyle(rail).position).toBe('sticky')
    expect(getComputedStyle(rail).alignSelf).toBe('start')
    expect(getComputedStyle(companion).position).toBe('static')
  })

  it('contains wide media inside the paper and gives tables their own scroll region', () => {
    const { table, pre, image } = renderArticleShell()

    expect(getComputedStyle(table).overflowX).toBe('auto')
    expect(getComputedStyle(pre).overflowX).toBe('auto')
    expect(getComputedStyle(image).maxWidth).toBe('100%')
  })
})
