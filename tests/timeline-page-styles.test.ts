import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const readStyles = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

function renderTimelineShell() {
  document.head.innerHTML = `
    <style>${readStyles('app/globals.css')}</style>
    <style>${readStyles('app/refinement.css')}</style>
    <style>${readStyles('app/studio.css')}</style>
    <style>${readStyles('components/TimelineReveal.css')}</style>
    <style>${readStyles('app/timeline.css')}</style>
  `
  document.body.innerHTML = `
    <main class="timeline-page timeline-page-body">
      <header class="page-intro"><h1>时间轴</h1></header>
      <section class="timeline" aria-label="时间轴记录">
        <section class="tl-year-group">
          <h2 class="tl-year"><span>2026</span></h2>
          <article class="tl-item tl-photo">
            <div class="tl-date">2026-09-03</div>
            <div class="tl-track">
              <span class="tl-dot"></span>
              <div class="tl-card">
                <div class="tl-body"><img class="tl-thumb" src="/path.jpg" alt="山路" /><div class="tl-text"><h3 class="tl-title">山路</h3></div></div>
              </div>
            </div>
          </article>
        </section>
      </section>
      <div class="timeline-more-wrap"><button class="timeline-unfold">续展旧卷</button></div>
      <div class="timeline-end" role="status"><span>卷尾</span></div>
    </main>
  `

  return {
    page: document.querySelector<HTMLElement>('.timeline-page')!,
    timeline: document.querySelector<HTMLElement>('.timeline')!,
    card: document.querySelector<HTMLElement>('.tl-card')!,
    image: document.querySelector<HTMLImageElement>('.tl-thumb')!,
    unfold: document.querySelector<HTMLElement>('.timeline-unfold')!,
    end: document.querySelector<HTMLElement>('.timeline-end')!,
  }
}

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('P06 chronicle paper recipe', () => {
  it('uses an open timeline surface instead of a stack of thick cards', () => {
    const { page, timeline, card } = renderTimelineShell()

    expect(page).toBeInTheDocument()
    expect(getComputedStyle(timeline).maxWidth).toBe('960px')
    expect(getComputedStyle(card).borderRadius).toBe('0px')
    expect(getComputedStyle(card).boxShadow).toBe('none')
    expect(getComputedStyle(card).backgroundColor).toBe('rgba(0, 0, 0, 0)')
  })

  it('reserves stable media space and keeps terminal controls reachable', () => {
    const { image, unfold, end } = renderTimelineShell()

    expect(getComputedStyle(image).aspectRatio).toBe('4 / 3')
    expect(getComputedStyle(image).objectFit).toBe('cover')
    expect(getComputedStyle(unfold).minHeight).toBe('44px')
    expect(getComputedStyle(end).minHeight).toBe('44px')
  })
})
