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
  it('keeps the page framed and gives most of the width to received messages', () => {
    const { page, sheet, layout } = renderGuestbookShell()

    expect(getComputedStyle(page).maxWidth).toBe('none')
    expect(getComputedStyle(page).width).toBe('auto')
    expect(getComputedStyle(sheet).padding).toBe('30px 29px 62px 52px')
    expect(getComputedStyle(layout).gridTemplateColumns).toBe('minmax(0, 1.95fr) minmax(390px, 1fr)')
    expect(getComputedStyle(layout).gap).toBe('14px')
  })

  it('uses a compact writing card without an empty spacer', () => {
    const { panel, entry, spacer } = renderGuestbookShell()

    expect(getComputedStyle(panel).minHeight).toBe('324px')
    expect(getComputedStyle(entry).minHeight).toBe('324px')
    expect(getComputedStyle(spacer).display).toBe('none')
  })

  it('keeps note cards and reply branches dense like the approved reference', () => {
    const { comment, replies, reply } = renderGuestbookShell()

    expect(getComputedStyle(comment).minHeight).toBe('292px')
    expect(getComputedStyle(comment).padding).toBe('34px 36px 30px 38px')
    expect(getComputedStyle(replies).marginTop).toBe('18px')
    expect(getComputedStyle(replies).paddingLeft).toBe('72px')
    expect(getComputedStyle(reply).minHeight).toBe('0')
    expect(getComputedStyle(reply).padding).toBe('16px 20px')
  })

  it('renders both hero lines with the flowing brush face used by the reference', () => {
    const { title, description } = renderGuestbookShell()

    expect(getComputedStyle(title).fontFamily).toContain('Zhi Mang Xing')
    expect(getComputedStyle(title).fontWeight).toBe('400')
    expect(getComputedStyle(description).fontFamily).toContain('Zhi Mang Xing')
    expect(getComputedStyle(description).fontWeight).toBe('400')
  })
})
