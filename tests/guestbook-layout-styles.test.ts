import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const guestbookStyles = readFileSync(resolve(process.cwd(), 'app/guestbook/guestbook.css'), 'utf8')

function renderGuestbookShell() {
  document.head.innerHTML = `<style>${guestbookStyles}</style>`
  document.body.innerHTML = `
    <main class="wrap guestbook-page">
      <section class="page-intro">
        <div class="page-intro-copy">
          <h1>留言</h1>
          <p class="page-intro-description">来者有言，皆收于此。</p>
        </div>
      </section>
      <article class="content-sheet guestbook-sheet">
        <div class="guestbook-layout">
          <section class="guestbook-messages"></section>
          <aside class="guestbook-window-panel">
            <button class="guestbook-window-entry">
              <span class="guestbook-window-space"></span>
            </button>
          </aside>
        </div>
      </article>
    </main>
  `

  return {
    page: document.querySelector<HTMLElement>('.guestbook-page')!,
    title: document.querySelector<HTMLElement>('.page-intro h1')!,
    description: document.querySelector<HTMLElement>('.page-intro-description')!,
    layout: document.querySelector<HTMLElement>('.guestbook-layout')!,
    panel: document.querySelector<HTMLElement>('.guestbook-window-panel')!,
    entry: document.querySelector<HTMLElement>('.guestbook-window-entry')!,
    spacer: document.querySelector<HTMLElement>('.guestbook-window-space')!,
  }
}

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('guestbook desktop composition', () => {
  it('keeps the page framed and gives most of the width to received messages', () => {
    const { page, layout } = renderGuestbookShell()

    expect(getComputedStyle(page).maxWidth).toBe('1180px')
    expect(getComputedStyle(page).width).toBe('auto')
    expect(getComputedStyle(layout).gridTemplateColumns).toBe('minmax(0, 1fr) minmax(320px, 356px)')
  })

  it('uses a compact writing card without an empty spacer', () => {
    const { panel, entry, spacer } = renderGuestbookShell()

    expect(getComputedStyle(panel).minHeight).toBe('286px')
    expect(getComputedStyle(entry).minHeight).toBe('286px')
    expect(getComputedStyle(spacer).display).toBe('none')
  })

  it('renders both hero lines with the dedicated flowing calligraphy face', () => {
    const { title, description } = renderGuestbookShell()

    expect(getComputedStyle(title).fontFamily).toContain('Zhi Mang Xing')
    expect(getComputedStyle(description).fontFamily).toContain('Zhi Mang Xing')
  })
})
