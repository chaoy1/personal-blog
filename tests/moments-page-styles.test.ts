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
      <section class="moments-sheet">
        <header class="moments-hero">
          <div class="moments-postmark">COLLECTED<br />NOTES</div>
          <div class="moments-hero-copy">
            <h1 class="moments-hero-title"><span><span class="moments-hero-char">闲</span></span></h1>
            <p class="moments-hero-lede">片言只语，也是一日光景。</p>
          </div>
        </header>
        <div class="moments-sheet-content">
          <div class="collection-heading"><h2>近来所记</h2></div>
          <article class="moment">
            <div class="date-rail"><span class="day">01</span><span class="month">SEP</span></div>
            <div class="moment-inner">
              <div class="moment-layout">
                <div class="moment-body"><p class="moment-content">沿着溪声走进一页春山。</p></div>
                <figure class="photo-leaf"><img src="/mountain.jpg" alt="闲语配图" /></figure>
              </div>
              <div class="moment-actions"><button class="moment-like">喜欢</button></div>
              <div class="moment-comments">
                <div class="moment-comment-form"><input /><button class="send">寄语</button></div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  `

  return {
    page: document.querySelector<HTMLElement>('.moments-page')!,
    sheet: document.querySelector<HTMLElement>('.moments-sheet')!,
    hero: document.querySelector<HTMLElement>('.moments-hero')!,
    title: document.querySelector<HTMLElement>('.moments-hero-title')!,
    postmark: document.querySelector<HTMLElement>('.moments-postmark')!,
    moment: document.querySelector<HTMLElement>('.moment')!,
    rail: document.querySelector<HTMLElement>('.date-rail')!,
    layout: document.querySelector<HTMLElement>('.moment-layout')!,
    content: document.querySelector<HTMLElement>('.moment-content')!,
    leaf: document.querySelector<HTMLElement>('.photo-leaf')!,
    image: document.querySelector<HTMLImageElement>('.photo-leaf img')!,
    like: document.querySelector<HTMLElement>('.moment-like')!,
    input: document.querySelector<HTMLElement>('.moment-comment-form input')!,
  }
}

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('P04 moments xuan paper scroll recipe', () => {
  it('draws one continuous sheet only a little wider than the reading column', () => {
    const { page, sheet } = renderMomentsShell()

    expect(page).toBeInTheDocument()
    // 纸面收到 960px：比默认正文栏（900px）略宽，但不至于散掉札记的紧凑感
    // （jsdom 不解析 min() 与 var()，所以核对样式表里的声明）
    const css = readStyles('app/moments.css')
    expect(css).toContain('width: min(960px, 100%)')
    expect(css).toContain('--mp-paper: #f0e2bc')
    expect(getComputedStyle(sheet).backgroundColor).toBe('var(--mp-paper)')
    expect(getComputedStyle(sheet).boxShadow).not.toBe('none')
    // 纸纹用背景图铺，不再是一层模糊玻璃（url() 藏在 --mp-fiber 里）
    expect(getComputedStyle(sheet).backgroundImage).toContain('linear-gradient(115deg')
    expect(css).toContain('--mp-fiber: url("data:image/svg+xml')
    expect(getComputedStyle(sheet).backdropFilter || 'none').toBe('none')
  })

  it('keeps the hero brush lettering, lede and postmark as the volume opening', () => {
    const { hero, title, postmark } = renderMomentsShell()

    const css = readStyles('app/moments.css')
    expect(getComputedStyle(hero).minHeight).toBe('318px')
    // 题字跟着纸面一起收：clamp 的中间值与上限都降下来
    expect(css).toContain('font-size: clamp(62px, 7vw, 84px)')
    expect(css).toContain('font-size: clamp(52px, 12vw, 68px)')
    // jsdom 不解析 var()，只核对题字声明了行书变量
    expect(getComputedStyle(title).fontFamily).toBe('var(--mp-brush)')
    expect(getComputedStyle(postmark).borderRadius).toBe('50%')
  })

  it('lays each note out as a date rail plus a two column note body', () => {
    const { moment, rail, layout, content, leaf } = renderMomentsShell()

    expect(getComputedStyle(moment).display).toBe('grid')
    // jsdom 把 0 归一化成 '0'，浏览器里仍是 0px：条目是直角纸片不是圆角卡片
    expect(getComputedStyle(moment).borderRadius).toMatch(/^0(px)?$/)
    // 左侧朱线是条目的分栏标记，不再靠独立厚卡片分隔
    expect(getComputedStyle(moment).borderLeftStyle).toBe('solid')
    expect(getComputedStyle(rail).position).toBe('relative')
    expect(getComputedStyle(layout).display).toBe('grid')
    expect(getComputedStyle(content).maxWidth).toBe('610px')
    // 照片压在纸上，带一点点倾斜
    expect(getComputedStyle(leaf).transform).toBe('rotate(1.3deg)')
  })

  it('reserves stable photo space and keeps every action reachable', () => {
    const { image, like, input } = renderMomentsShell()

    expect(getComputedStyle(image).height).toBe('194px')
    expect(getComputedStyle(image).objectFit).toBe('cover')
    expect(getComputedStyle(image).maxWidth).toBe('100%')
    expect(getComputedStyle(like).minHeight).toBe('44px')
    expect(getComputedStyle(input).minHeight).toBe('44px')
  })

  it('ships the bundled brush font for the volume title', () => {
    const css = readStyles('app/moments.css')

    expect(css).toContain('@import url("/fonts/hongleixingshu/font.css")')
    expect(css).toContain('--mp-brush')
  })
})
