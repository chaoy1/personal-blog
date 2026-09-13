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
            <div class="guestbook-window-entry">
              <span class="guestbook-window-title">山窗寄语</span>
              <span class="guestbook-window-space"></span>
              <button class="guestbook-window-action">写留言</button>
            </div>
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
      <div class="guestbook-sheet-scenery" aria-hidden="true"></div>
      <header class="guestbook-sheet-head">
        <span class="guestbook-sheet-mark"><b>05</b><span class="guestbook-sheet-eyebrow">BY THE WINDOW</span></span>
        <button class="guestbook-sheet-close" type="button">收笺</button>
      </header>
      <div class="guestbook-sheet-title">
        <h2>山窗寄语</h2>
        <p>窗外有山，纸上有话。</p>
      </div>
      <div class="guestbook-sheet-write">
        <div class="guestbook-sheet-gutter" aria-hidden="true">
          <i>01</i><i>02</i><i>03</i><i>04</i><i>05</i><i>06</i><i>07</i>
        </div>
        <div class="guestbook-sheet-paperline">
          <textarea class="guestbook-immersive-textarea" aria-label="留言内容"></textarea>
        </div>
      </div>
      <footer class="guestbook-immersive-foot">
        <span class="moments-counter">0 / 500</span>
      </footer>
      <span class="guestbook-sheet-seal" aria-hidden="true">寄</span>
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
    action: document.querySelector<HTMLElement>('.guestbook-window-action')!,
    panelTitle: document.querySelector<HTMLElement>('.guestbook-window-title')!,
    spacer: document.querySelector<HTMLElement>('.guestbook-window-space')!,
    comment: document.querySelector<HTMLElement>('.guestbook-list > .comment')!,
    replies: document.querySelector<HTMLElement>('.comment-replies')!,
    reply: document.querySelector<HTMLElement>('.comment.reply')!,
    immersiveSheet: document.querySelector<HTMLElement>('.guestbook-immersive-sheet')!,
    immersiveTitle: document.querySelector<HTMLElement>('.guestbook-sheet-title h2')!,
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

  it('lays the whole page on one sheet of xuan paper like the other inner pages', () => {
    const { page, sheet } = renderGuestbookShell()
    const pageStyle = getComputedStyle(page)

    expect(pageStyle.maxWidth).toBe('1080px')
    expect(pageStyle.width).toBe('auto')
    // 底纸直接铺在页面容器上：纸面宽度与正文宽度一致，不再多出一层。
    expect(pageStyle.backgroundImage).toContain('var(--gb-botanical-art)')
    expect(pageStyle.backgroundImage).toContain('var(--gb-paper-fibers)')
    expect(pageStyle.backgroundImage).toContain('var(--card-paper)')
    expect(pageStyle.backgroundBlendMode).toContain('multiply')
    expect(pageStyle.overflow).toBe('hidden')
    expect(pageStyle.paddingLeft).toBe('0px')
    expect(pageStyle.paddingRight).toBe('0px')
    // 卷纸的圆角与投影写在源码里（jsdom 不解析 border-radius 长写属性）。
    expect(guestbookStyles).toMatch(/\.wrap\.guestbook-page \{[\s\S]*?border-radius: 3px;/)
    expect(guestbookStyles).toMatch(/\.wrap\.guestbook-page \{[\s\S]*?box-shadow: 0 30px 68px -42px/)
    // 题头与正文交回给纸面，不再各自铺一层。
    expect(getComputedStyle(sheet).backgroundImage).toBe('none')
    expect(getComputedStyle(sheet).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(getComputedStyle(sheet).paddingLeft).toBe('24px')
    expect(getComputedStyle(sheet).paddingRight).toBe('24px')
  })

  it('opens the composer only from the button, not the whole writing card', () => {
    const { entry, action } = renderGuestbookShell()

    // 面板本身不接收指针事件，只有按钮可以点。
    expect(getComputedStyle(entry).pointerEvents).toBe('none')
    expect(getComputedStyle(action).pointerEvents).toBe('auto')
    expect(getComputedStyle(action).cursor).toBe('pointer')
    // 按钮上的按动反馈。
    expect(guestbookStyles).toMatch(
      /\.guestbook-window-panel \.guestbook-window-action:active \{[\s\S]*?transform: translateY\(2px\) scale\(0\.985\);/,
    )
    expect(guestbookStyles).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.guestbook-window-panel \.guestbook-window-action:active \{[\s\S]*?transform: none;/,
    )
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
    // 写留言弹层改用真迹山水做底，纸纹仍压在下面。
    expect(getComputedStyle(immersiveSheet).backgroundImage).toContain('var(--card-paper)')
    expect(getComputedStyle(immersiveSheet).backgroundImage).toContain('var(--gb-paper-fibers)')
  })

  it('lays the compose sheet on the real ink painting with a paper letter-paper structure', () => {
    const { immersiveSheet } = renderGuestbookShell()

    // 真迹山水 + 护字层 + 行号栏 + 压角闲章
    expect(immersiveSheet.querySelector('.guestbook-sheet-scenery')).not.toBeNull()
    expect(immersiveSheet.querySelectorAll('.guestbook-sheet-gutter i')).toHaveLength(7)
    expect(immersiveSheet.querySelector('.guestbook-sheet-seal')).not.toBeNull()
    expect(guestbookStyles).toMatch(
      /\.guestbook-sheet-scenery::before \{[\s\S]*?guestbook-ink-banner\.webp"\) center bottom \/ cover no-repeat;/,
    )
    // 行号与正文同行：两者行高一致
    const gutterRow = immersiveSheet.querySelector<HTMLElement>('.guestbook-sheet-gutter i')!
    const composerTextarea = immersiveSheet.querySelector<HTMLTextAreaElement>('.guestbook-immersive-textarea')!
    expect(getComputedStyle(gutterRow).lineHeight).toBe(getComputedStyle(composerTextarea).lineHeight)
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

  it('sets 留言 in a running-script face and 山窗寄语 in a brush face', () => {
    const { title, panelTitle, immersiveTitle, description } = renderGuestbookShell()

    // 题头「留言」：红雷行书（行书），牵丝连带。
    expect(getComputedStyle(title).fontFamily).toContain('hongleixingshu')
    expect(getComputedStyle(title).fontWeight).toBe('400')
    // 面板与弹层题头：行草味的 Zhi Mang Xing。
    expect(getComputedStyle(panelTitle).fontFamily).toContain('Zhi Mang Xing')
    expect(getComputedStyle(immersiveTitle).fontFamily).toContain('Zhi Mang Xing')
    expect(getComputedStyle(panelTitle).fontWeight).toBe('400')
    // 两处题字分属不同字体族，不再共用一个字体栈。
    expect(getComputedStyle(title).fontFamily).not.toBe(getComputedStyle(panelTitle).fontFamily)
    // 引文仍保留手写笔意。
    expect(getComputedStyle(description).fontFamily).toContain('Zhi Mang Xing')
    expect(getComputedStyle(description).fontWeight).toBe('400')
  })

  it('自托管行书字体并按 unicode-range 分片，不整包加载', () => {
    // 字体不进 JS 包，走 public 绝对路径；分片由浏览器按用到的字按需取。
    expect(guestbookStyles).toContain('@import url("/fonts/hongleixingshu/font.css")')
    const fontCss = readFileSync(
      resolve(process.cwd(), 'public/fonts/hongleixingshu/font.css'),
      'utf8',
    )
    expect(fontCss).toContain("font-family: 'hongleixingshu'")
    expect(fontCss.match(/unicode-range:/g)?.length ?? 0).toBeGreaterThan(50)
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
