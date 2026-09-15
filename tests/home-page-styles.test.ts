import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const readStyles = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')
const globalStyles = readStyles('app/globals.css')
const refinementStyles = readStyles('app/refinement.css')
const studioStyles = readStyles('app/studio.css')
const homeStyles = readStyles('app/home.css')

function renderHomeShell() {
  document.head.innerHTML = `
    <style>${globalStyles}</style>
    <style>${refinementStyles}</style>
    <style>${studioStyles}</style>
    <style>${homeStyles}</style>
  `
  document.body.innerHTML = `
    <main class="wrap home-page">
      <section class="home-hero">
        <header class="masthead"><h1><span class="title">似水流年</span></h1></header>
        <nav class="hero-stats" aria-label="站点内容概览">
          <a class="home-stat-link hs-item button-hit-area"><b>12</b><i>文章</i></a>
          <a class="home-stat-link hs-item button-hit-area"><b>4</b><i>闲语</i></a>
          <a class="home-stat-link hs-item button-hit-area"><b>8</b><i>光影</i></a>
        </nav>
        <aside class="daily-quote">
          <span class="dq-seal">句</span><p class="dq-text">山水有清音。</p><span class="dq-source">— 题记</span><button class="dq-shuffle">换</button>
        </aside>
        <button class="scroll-hint">向下浏览</button>
      </section>
      <section class="section section-loose home-section"></section>
    </main>
  `

  return {
    stats: document.querySelector<HTMLElement>('.hero-stats')!,
    statLink: document.querySelector<HTMLElement>('.home-stat-link')!,
    quote: document.querySelector<HTMLElement>('.daily-quote')!,
    shuffle: document.querySelector<HTMLElement>('.dq-shuffle')!,
    hint: document.querySelector<HTMLElement>('.scroll-hint')!,
    section: document.querySelector<HTMLElement>('.home-section')!,
  }
}

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('P01 home page recipe', () => {
  it('turns the content statistics into a restrained paper ledger with accessible targets', () => {
    const { stats, statLink } = renderHomeShell()

    expect(getComputedStyle(stats).borderRadius).toBe('2px')
    expect(getComputedStyle(stats).maxWidth).toBe('520px')
    expect(getComputedStyle(statLink).minHeight).toBe('44px')
  })

  it('keeps the quote and scroll affordances compact while preserving 44px controls', () => {
    const { quote, shuffle, hint } = renderHomeShell()

    expect(getComputedStyle(quote).borderRadius).toBe('2px')
    expect(getComputedStyle(quote).maxWidth).toBe('620px')
    expect(getComputedStyle(shuffle).minWidth).toBe('44px')
    expect(getComputedStyle(shuffle).minHeight).toBe('44px')
    expect(getComputedStyle(hint).minHeight).toBe('44px')
  })

  it('uses the Phase 1 spacing scale for homepage sections', () => {
    const { section } = renderHomeShell()

    expect(getComputedStyle(section).marginTop).toBe('var(--space-16)')
  })
})
