import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const guestbookStyles = readFileSync(resolve(process.cwd(), 'app/guestbook/guestbook.css'), 'utf8')

function renderGuestbookShell() {
  document.head.innerHTML = `<style>${guestbookStyles}</style>`
  document.body.innerHTML = `
    <main class="wrap guestbook-page">
      <nav class="article-nav">返回首页</nav>
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
    nav: document.querySelector<HTMLElement>('.article-nav')!,
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
  it('starts with the landscape instead of a separate secondary-navigation band', () => {
    const { nav } = renderGuestbookShell()

    expect(getComputedStyle(nav).display).toBe('none')
  })

  it('keeps the paper field full width with equal content gutters', () => {
    const { page, sheet, layout } = renderGuestbookShell()

    expect(getComputedStyle(page).maxWidth).toBe('none')
    expect(getComputedStyle(page).width).toBe('auto')
    expect(getComputedStyle(sheet).paddingLeft).toBe('52px')
    expect(getComputedStyle(sheet).paddingRight).toBe('52px')
  })

  it('reserves the upper twenty-eight percent for the landscape heading', () => {
    const { title } = renderGuestbookShell()
    const hero = title.closest<HTMLElement>('.page-intro')!

    expect(getComputedStyle(hero).minHeight).toBe('clamp(280px, 28vh, 330px)')
  })

  it('gives the message column twice the weight of the writing column and aligns their tops', () => {
    const { layout } = renderGuestbookShell()

    expect(getComputedStyle(layout).gridTemplateColumns).toBe('minmax(0, 2fr) minmax(320px, 1fr)')
    expect(getComputedStyle(layout).gap).toBe('18px')
    expect(getComputedStyle(layout).alignItems).toBe('start')
  })

  it('uses a compact writing card without an empty spacer', () => {
    const { panel, entry, spacer } = renderGuestbookShell()

    expect(getComputedStyle(panel).minHeight).toBe('324px')
    expect(getComputedStyle(entry).minHeight).toBe('324px')
    expect(getComputedStyle(spacer).display).toBe('none')
  })

  it('lets note-card height follow its content and keeps reply branches indented', () => {
    const { comment, replies, reply } = renderGuestbookShell()

    expect(getComputedStyle(comment).minHeight).toBe('0')
    expect(getComputedStyle(comment).marginLeft).toBe('0px')
    expect(getComputedStyle(comment).padding).toBe('30px 34px 30px 42px')
    expect(getComputedStyle(replies).marginTop).toBe('20px')
    expect(getComputedStyle(replies).paddingLeft).toBe('64px')
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
