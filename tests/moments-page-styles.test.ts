import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const readStyles = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

function renderMomentsShell() {
  document.head.innerHTML = `
    <style>${readStyles('app/globals.css')}</style>
    <style>${readStyles('app/refinement.css')}</style>
    <style>${readStyles('app/studio.css')}</style>
    <style>${readStyles('app/moments.css')}</style>
  `
  document.body.innerHTML = `
    <main class="moments-page">
      <header class="page-intro"><h1>闲语</h1></header>
      <section class="article content-sheet moments-sheet" aria-label="闲语列表">
        <article class="moment">
          <div class="moment-head"><span class="moment-avatar">旅</span></div>
          <p class="moment-content">沿着溪声走进一页春山。</p>
          <div class="moment-images"><img src="/mountain.jpg" alt="闲语配图" /></div>
          <div class="moment-actions"><button class="moment-like">点赞</button></div>
          <div class="moment-comments">
            <div class="moment-comment-form"><input /><button class="btn btn-sm">发送</button></div>
          </div>
        </article>
      </section>
    </main>
  `

  return {
    page: document.querySelector<HTMLElement>('.moments-page')!,
    sheet: document.querySelector<HTMLElement>('.moments-sheet')!,
    moment: document.querySelector<HTMLElement>('.moment')!,
    content: document.querySelector<HTMLElement>('.moment-content')!,
    image: document.querySelector<HTMLImageElement>('.moment-images img')!,
    like: document.querySelector<HTMLElement>('.moment-like')!,
    input: document.querySelector<HTMLElement>('.moment-comment-form input')!,
  }
}

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('P04 moments paper collection recipe', () => {
  it('keeps the paper sheet narrower than the page and renders moments as open notes', () => {
    const { page, sheet, moment, content } = renderMomentsShell()

    expect(page).toBeInTheDocument()
    expect(getComputedStyle(sheet).maxWidth).toBe('900px')
    expect(getComputedStyle(moment).borderRadius).toBe('0px')
    expect(getComputedStyle(moment).boxShadow).toBe('none')
    expect(getComputedStyle(moment).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(getComputedStyle(content).maxWidth).toBe('680px')
  })

  it('reserves stable image space and keeps moment actions reachable', () => {
    const { image, like, input } = renderMomentsShell()

    expect(getComputedStyle(image).aspectRatio).toBe('1')
    expect(getComputedStyle(image).maxWidth).toBe('100%')
    expect(getComputedStyle(like).minHeight).toBe('44px')
    expect(getComputedStyle(input).minHeight).toBe('44px')
  })
})
