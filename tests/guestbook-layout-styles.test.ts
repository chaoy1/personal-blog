import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const guestbookStyles = readFileSync(resolve(process.cwd(), 'app/guestbook/guestbook.css'), 'utf8')

function renderGuestbookShell() {
  document.head.innerHTML = `
    <style>:root { --card-paper: url("/paper-fibers.svg"); }</style>
    <style>${guestbookStyles}</style>
  `
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
              <span class="guestbook-window-title">山窗寄语</span>
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
    <section class="guestbook-immersive-sheet">
      <header class="guestbook-immersive-head"><h2>山窗寄语</h2></header>
    </section>
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
    panelTitle: document.querySelector<HTMLElement>('.guestbook-window-title')!,
    spacer: document.querySelector<HTMLElement>('.guestbook-window-space')!,
    comment: document.querySelector<HTMLElement>('.guestbook-list > .comment')!,
    replies: document.querySelector<HTMLElement>('.comment-replies')!,
    reply: document.querySelector<HTMLElement>('.comment.reply')!,
    immersiveSheet: document.querySelector<HTMLElement>('.guestbook-immersive-sheet')!,
    immersiveTitle: document.querySelector<HTMLElement>('.guestbook-immersive-head h2')!,
  }
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('guestbook desktop composition', () => {
  it('starts with the landscape instead of a separate secondary-navigation band', () => {
    const { nav } = renderGuestbookShell()

    expect(getComputedStyle(nav).display).toBe('none')
  })

  it('uses the same restrained page width without a full-height paper backdrop', () => {
    const { page, sheet } = renderGuestbookShell()

    expect(getComputedStyle(page).maxWidth).toBe('1080px')
    expect(getComputedStyle(page).width).toBe('auto')
    expect(getComputedStyle(page).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(getComputedStyle(page).backgroundImage).toBe('none')
    expect(getComputedStyle(sheet).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(getComputedStyle(sheet).backgroundImage).toBe('none')
    expect(getComputedStyle(sheet).paddingLeft).toBe('24px')
    expect(getComputedStyle(sheet).paddingRight).toBe('24px')
  })

  it('keeps the landscape heading compact inside the restrained page', () => {
    const { title } = renderGuestbookShell()
    const hero = title.closest<HTMLElement>('.page-intro')!

    expect(getComputedStyle(hero).minHeight).toBe('228px')
  })

  it('gives the message column twice the weight of the writing column and aligns their tops', () => {
    const { layout } = renderGuestbookShell()

    expect(getComputedStyle(layout).gridTemplateColumns).toBe('minmax(0, 2fr) minmax(290px, 1fr)')
    expect(getComputedStyle(layout).gap).toBe('20px')
    expect(getComputedStyle(layout).alignItems).toBe('start')
  })

  it('uses a compact writing card without an empty spacer', () => {
    const { panel, entry, spacer } = renderGuestbookShell()

    expect(getComputedStyle(panel).minHeight).toBe('314px')
    expect(getComputedStyle(entry).minHeight).toBe('314px')
    expect(getComputedStyle(spacer).display).toBe('none')
  })

  it('renders visible xuan-paper grain and painterly botanical art on every writing sheet', () => {
    const { page, panel, comment, reply, immersiveSheet } = renderGuestbookShell()
    const paperTexture = getComputedStyle(document.documentElement).getPropertyValue('--card-paper')
    const paperFibers = getComputedStyle(page).getPropertyValue('--gb-paper-fibers')

    expect(paperTexture).toContain('paper-fibers.svg')
    expect(paperFibers).toContain('guestbook-paper-fibers.svg')
    expect(getComputedStyle(panel).backgroundImage).toContain('var(--card-paper)')
    expect(getComputedStyle(panel).backgroundImage).toContain('var(--gb-paper-fibers)')
    expect(getComputedStyle(panel).backgroundImage).toContain('var(--gb-botanical-art)')
    expect(getComputedStyle(comment).backgroundImage).toContain('var(--card-paper)')
    expect(getComputedStyle(comment).backgroundImage).toContain('var(--gb-paper-fibers)')
    expect(getComputedStyle(comment).backgroundImage).toContain('var(--gb-botanical-art)')
    expect(getComputedStyle(reply).backgroundImage).toContain('var(--card-paper)')
    expect(getComputedStyle(reply).backgroundImage).toContain('var(--gb-paper-fibers)')
    expect(getComputedStyle(immersiveSheet).backgroundImage).toContain('guestbook-botanical.svg')
  })

  it('lets note-card height follow its content and keeps reply branches indented', () => {
    const { comment, replies, reply } = renderGuestbookShell()

    expect(getComputedStyle(comment).minHeight).toBe('232px')
    expect(getComputedStyle(comment).marginLeft).toBe('0px')
    expect(getComputedStyle(comment).padding).toBe('28px 30px 28px 40px')
    expect(getComputedStyle(replies).marginTop).toBe('20px')
    expect(getComputedStyle(replies).paddingLeft).toBe('64px')
    expect(getComputedStyle(reply).minHeight).toBe('0')
    expect(getComputedStyle(reply).padding).toBe('16px 20px')
  })

  it('uses the self-hosted artistic brush face for both guestbook titles', () => {
    const { title, panelTitle, immersiveTitle, description } = renderGuestbookShell()

    expect(getComputedStyle(title).fontFamily).toContain('Long Cang')
    expect(getComputedStyle(title).fontWeight).toBe('400')
    expect(getComputedStyle(panelTitle).fontFamily).toContain('Long Cang')
    expect(getComputedStyle(immersiveTitle).fontFamily).toContain('Long Cang')
    expect(getComputedStyle(description).fontFamily).toContain('Zhi Mang Xing')
    expect(getComputedStyle(description).fontWeight).toBe('400')
  })

  it('keeps nested reply paper dark and textured in night mode', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    const { page, panel, comment, reply } = renderGuestbookShell()

    expect(getComputedStyle(reply).backgroundColor).toBe('rgba(58, 53, 40, 0.92)')
    expect(getComputedStyle(reply).backgroundImage).toContain('var(--gb-paper-fibers)')
    expect(getComputedStyle(reply).backgroundImage).toContain('var(--card-paper)')
    expect(getComputedStyle(page).getPropertyValue('--gb-landscape-tone')).toContain('brightness(0.42)')
    expect(getComputedStyle(panel).backgroundImage).not.toContain('guestbook-ink-banner')
    expect(getComputedStyle(comment).backgroundImage).not.toContain('guestbook-ink-banner')

    const darkPanelRule = Array.from(guestbookStyles.matchAll(/:root\[data-theme='dark'\] \.guestbook-window-panel \{[\s\S]*?\}/g)).at(-1)?.[0]
    const darkCommentRule = Array.from(guestbookStyles.matchAll(/:root\[data-theme='dark'\] \.guestbook-page \.guestbook-list > \.comment,[\s\S]*?\}/g)).at(-1)?.[0]
    expect(darkPanelRule).not.toContain('guestbook-ink-banner')
    expect(darkCommentRule).not.toContain('guestbook-ink-banner')
  })
})
