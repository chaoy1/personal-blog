import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const readStyles = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

function renderPostsShell() {
  document.head.innerHTML = `
    <style>${readStyles('app/globals.css')}</style>
    <style>${readStyles('app/refinement.css')}</style>
    <style>${readStyles('app/studio.css')}</style>
    <style>${readStyles('app/posts.css')}</style>
  `
  document.body.innerHTML = `
    <main class="posts-page collection-scroll collection-scroll-posts">
      <header class="page-intro page-intro--standard"><h1>全部文章</h1></header>
      <ol class="list posts-list" aria-label="文章目录">
        <li class="posts-list-item">
          <a class="item archive-post-card is-in" data-post-row="true">
            <span class="hpc-index"><b>01</b><i>文</i></span>
            <div class="hpc-copy">
              <div class="hpc-meta"><span>典藏 · ARTICLE</span><time>2026年9月1日</time></div>
              <h2 class="post-title">山中一日</h2>
              <span class="ex">沿着溪声走进一页春山。</span>
              <span class="item-foot"><span class="hpc-note">第 01 卷 · 手记</span><span class="read">阅读全文</span></span>
            </div>
          </a>
        </li>
      </ol>
    </main>
  `

  return {
    card: document.querySelector<HTMLElement>('.archive-post-card')!,
    read: document.querySelector<HTMLElement>('.read')!,
    postsList: document.querySelector<HTMLElement>('.posts-list')!,
  }
}

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('P02 open collection recipe', () => {
  it('uses a stable book-row grid with a separator instead of a card wall', () => {
    const { card, postsList } = renderPostsShell()

    expect(getComputedStyle(postsList).listStyleType).toBe('none')
    expect(getComputedStyle(card).gridTemplateColumns).toBe('76px minmax(0, 1fr)')
    expect(getComputedStyle(card).borderTopWidth).toBe('1px')
    expect(getComputedStyle(card).boxShadow).toBe('none')
  })

  it('keeps the reading action reachable', () => {
    const { read } = renderPostsShell()

    expect(getComputedStyle(read).minHeight).toBe('44px')
  })

  it('keeps the mobile pager controls reachable without relying on root clipping', () => {
    const styles = readStyles('app/posts.css')

    expect(styles).toMatch(/\.posts-page > \.pager\s*\{[\s\S]*display:\s*grid/)
    expect(styles).toMatch(/\.posts-page > \.pager \.pager-info\s*\{[\s\S]*white-space:\s*normal/)
  })
})
