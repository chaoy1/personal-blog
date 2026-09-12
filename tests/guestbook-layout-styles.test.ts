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
      <div class="guestbook-list">
        <div class="comment">
          <div class="comment-body">
            <div class="comment-replies">
              <div class="comment reply"><div class="comment-body">回复</div></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  `

  return {
    page: document.querySelector<HTMLElement>('.guestbook-page')!,
    intro: document.querySelector<HTMLElement>('.page-intro')!,
    title: document.querySelector<HTMLElement>('.page-intro h1')!,
    description: document.querySelector<HTMLElement>('.page-intro-description')!,
    sheet: document.querySelector<HTMLElement>('.guestbook-sheet')!,
    layout: document.querySelector<HTMLElement>('.guestbook-layout')!,
    panel: document.querySelector<HTMLElement>('.guestbook-window-panel')!,
    entry: document.querySelector<HTMLElement>('.guestbook-window-entry')!,
    spacer: document.querySelector<HTMLElement>('.guestbook-window-space')!,
    comment: document.querySelector<HTMLElement>('.guestbook-list > .comment')!,
    replies: document.querySelector<HTMLElement>('.comment-replies')!,
    reply: document.querySelector<HTMLElement>('.comment.reply')!,
  }
}

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('guestbook desktop composition', () => {
  it('centres the page column and gives most of the width to received messages', () => {
    const { page, sheet, layout } = renderGuestbookShell()

    expect(getComputedStyle(page).maxWidth).toBe('1240px')
    expect(getComputedStyle(page).width).toBe('auto')
    expect(getComputedStyle(page).marginLeft).toBe('auto')
    expect(getComputedStyle(page).marginRight).toBe('auto')
    expect(getComputedStyle(sheet).padding).toBe('28px 0px 0px')
    expect(getComputedStyle(sheet).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(getComputedStyle(layout).gridTemplateColumns).toBe('minmax(0, 1fr) minmax(320px, 420px)')
    expect(getComputedStyle(layout).gap).toBe('24px')
  })

  it('shows the whole landscape banner without cropping it', () => {
    const { intro } = renderGuestbookShell()

    expect(getComputedStyle(intro).minHeight).toBe('184px')
    expect(getComputedStyle(intro).backgroundColor).toBe('rgb(236, 228, 208)')
    expect(guestbookStyles).toMatch(
      /\.wrap\.guestbook-page > \.page-intro::after \{[\s\S]*?guestbook-ink-banner\.webp"\) center \/ 100% 100% no-repeat;/,
    )
  })

  it('gives the writing card a full-height pine spine and no paper spacer', () => {
    const { panel, entry, spacer } = renderGuestbookShell()

    expect(getComputedStyle(panel).minHeight).toBe('392px')
    expect(getComputedStyle(entry).minHeight).toBe('392px')
    expect(getComputedStyle(spacer).display).toBe('none')
  })

  it('renders note cards as ruled paper with a pine spine and a reply branch', () => {
    const { comment, replies, reply } = renderGuestbookShell()

    expect(getComputedStyle(comment).minHeight).toBe('255px')
    expect(getComputedStyle(comment).padding).toBe('32px 36px 28px 44px')
    expect(getComputedStyle(comment).borderRadius).toBe('3px')
    expect(getComputedStyle(replies).marginTop).toBe('20px')
    expect(getComputedStyle(replies).paddingLeft).toBe('64px')
    expect(getComputedStyle(reply).minHeight).toBe('76px')
    expect(getComputedStyle(reply).padding).toBe('14px 20px')
  })

  it('renders both hero lines with the flowing brush face used by the reference', () => {
    const { title, description } = renderGuestbookShell()

    expect(getComputedStyle(title).fontFamily).toContain('Zhi Mang Xing')
    expect(getComputedStyle(title).fontWeight).toBe('400')
    expect(getComputedStyle(description).fontFamily).toContain('Zhi Mang Xing')
    expect(getComputedStyle(description).fontWeight).toBe('400')
  })
})
