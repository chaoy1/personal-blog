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
      <section class="posts-sheet">
        <div class="top-rule"></div>
        <header class="posts-hero">
          <div class="posts-hero-copy">
            <h1><span class="title">文章</span><span class="title-tail">一册手记</span></h1>
          </div>
          <div class="posts-hero-art"></div>
          <span class="posts-hero-stamp">文</span>
        </header>
        <div class="catalog-heading"><div class="left"><h2>篇目</h2></div><div class="count">共收录 <b>02</b> 篇</div></div>
        <ol class="entries" aria-label="文章目录">
          <li class="entry" data-post-row="true">
            <div class="entry-number"><strong>01</strong><i>文</i></div>
            <div class="entry-body">
              <div class="entry-meta"><span>ARTICLE</span><i class="meta-line"></i><span>第壹篇</span></div>
              <h2 class="entry-title"><a href="/posts/a">山中一日</a></h2>
            </div>
            <div class="entry-info"><time>2026.09.01</time><a class="entry-link" href="/posts/a">读此篇 <span>→</span></a></div>
          </li>
          <li class="entry featured" data-post-row="true">
            <div class="entry-number"><strong>02</strong><i>文</i></div>
            <div class="entry-body">
              <div class="entry-meta"><span>ARTICLE</span><i class="meta-line"></i><span>第贰篇</span></div>
              <h2 class="entry-title"><a href="/posts/b">桥边晚照</a></h2>
              <p class="entry-excerpt">天色收拢，灯影刚好。</p>
            </div>
            <div class="entry-info"><time>2026.08.21</time><a class="entry-link" href="/posts/b">读此篇 <span>→</span></a></div>
          </li>
        </ol>
      </section>
      <p class="page-footer">山水有尽 · 文字无涯</p>
    </main>
  `

  return {
    sheet: document.querySelector<HTMLElement>('.posts-sheet')!,
    topRule: document.querySelector<HTMLElement>('.top-rule')!,
    hero: document.querySelector<HTMLElement>('.posts-hero')!,
    stamp: document.querySelector<HTMLElement>('.posts-hero-stamp')!,
    entry: document.querySelector<HTMLElement>('.entry')!,
    featured: document.querySelector<HTMLElement>('.entry.featured')!,
    number: document.querySelector<HTMLElement>('.entry-number')!,
    title: document.querySelector<HTMLElement>('.entry.featured .entry-title')!,
    link: document.querySelector<HTMLElement>('.entry-link')!,
    entries: document.querySelector<HTMLElement>('.entries')!,
  }
}

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('P02 xuan paper collection recipe', () => {
  it('draws the catalog on one continuous paper scroll', () => {
    const { sheet, topRule, hero, stamp } = renderPostsShell()
    const styles = readStyles('app/posts.css')

    // 整卷一张纸：纸色来自 --pp-paper 变量（jsdom 不解析 var()，核对声明）
    expect(styles).toContain('--pp-paper: #eee0b9')
    expect(getComputedStyle(sheet).backgroundColor).toBe('var(--pp-paper)')
    expect(getComputedStyle(sheet).boxShadow).not.toBe('none')
    expect(getComputedStyle(sheet).borderRadius).toBe('0')
    expect(getComputedStyle(sheet).backdropFilter || 'none').toBe('none')
    // 卷首最上面那道朱线
    expect(getComputedStyle(topRule).height).toBe('5px')
    expect(getComputedStyle(hero).display).toBe('grid')
    expect(getComputedStyle(hero).minHeight).toBe('352px')
    // 卷首印章
    expect(getComputedStyle(stamp).position).toBe('absolute')
    expect(styles).toMatch(/\.posts-hero-stamp\s*\{[\s\S]*background:\s*var\(--pp-seal\)/)
  })

  it('sets every entry on a number / body / date grid', () => {
    const { entry, number, entries } = renderPostsShell()

    expect(getComputedStyle(entries).listStyleType).toBe('none')
    expect(getComputedStyle(entry).gridTemplateColumns).toBe('74px minmax(0, 1fr) 123px')
    expect(getComputedStyle(entry).columnGap).toBe('23px')
    expect(getComputedStyle(entry).minHeight).toBe('166px')
    // 左侧朱线是条目的起首标记，不是厚卡片
    expect(getComputedStyle(entry).borderLeftWidth).toBe('0px')
    expect(getComputedStyle(number).flexDirection).toBe('column')
  })

  it('gives the featured leaf more room and a corner fold', () => {
    const { featured, title } = renderPostsShell()
    const styles = readStyles('app/posts.css')

    expect(getComputedStyle(featured).minHeight).toBe('198px')
    expect(getComputedStyle(title).fontSize).toContain('clamp(28px, 3vw, 37px)')
    // 折角只在 featured 上出现
    expect(styles).toMatch(/\.entry\.featured::after\s*\{[\s\S]*border-top:\s*1px solid var\(--pp-seal\)/)
  })

  it('keeps the reading action and the mobile pager reachable', () => {
    const { link } = renderPostsShell()
    const styles = readStyles('app/posts.css')

    expect(getComputedStyle(link).minHeight).toBe('44px')
    expect(styles).toMatch(/\.posts-page > \.posts-sheet > \.pager\s*\{[\s\S]*display:\s*grid/)
    expect(styles).toMatch(/\.posts-page > \.posts-sheet > \.pager \.pager-info\s*\{[\s\S]*white-space:\s*normal/)
  })

  it('ships the bundled brush font and a dark paper palette', () => {
    const styles = readStyles('app/posts.css')

    expect(styles).toContain('@import url("/fonts/hongleixingshu/font.css")')
    expect(styles).toContain('--pp-brush')
    expect(styles).toMatch(/:root\[data-theme='dark'\] \.posts-page \{[\s\S]*--pp-paper: #3d3428/)
  })
})
