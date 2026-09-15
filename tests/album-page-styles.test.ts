import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const readStyles = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

function renderAlbumShell() {
  document.head.innerHTML = `
    <style>${readStyles('app/globals.css')}</style>
    <style>${readStyles('app/refinement.css')}</style>
    <style>${readStyles('app/studio.css')}</style>
    <style>${readStyles('app/album.css')}</style>
  `
  document.body.innerHTML = `
    <main class="album-page">
      <header class="page-intro"><h1>光影</h1></header>
      <section class="article content-sheet album-sheet" aria-label="相册详情">
        <div class="album-head">
          <button class="album-back">← 全部相册</button>
          <div class="album-head-text"><h2>春山册</h2><span>2 张</span></div>
        </div>
        <div class="album-grid">
          <figure class="album-item">
            <span class="album-photo-index">FRAME 01</span>
            <div class="album-photo-frame"><img src="/spring.jpg" alt="桥边晚照" /></div>
            <figcaption>桥边晚照</figcaption>
            <span class="album-date">2026-09-02</span>
          </figure>
        </div>
      </section>
    </main>
  `

  return {
    page: document.querySelector<HTMLElement>('.album-page')!,
    sheet: document.querySelector<HTMLElement>('.album-sheet')!,
    item: document.querySelector<HTMLElement>('.album-item')!,
    frame: document.querySelector<HTMLElement>('.album-photo-frame')!,
    image: document.querySelector<HTMLImageElement>('.album-photo-frame img')!,
    back: document.querySelector<HTMLElement>('.album-back')!,
  }
}

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('P05 album paper collection recipe', () => {
  it('keeps the shelf and detail view on one wide paper sheet', () => {
    const { page, sheet, item, back } = renderAlbumShell()

    expect(page).toBeInTheDocument()
    expect(getComputedStyle(sheet).maxWidth).toBe('1080px')
    expect(getComputedStyle(item).borderRadius).toBe('1px')
    expect(getComputedStyle(item).boxShadow).not.toBe('none')
    expect(getComputedStyle(back).minHeight).toBe('44px')
  })

  it('reserves fixed image space for both covers and photo frames', () => {
    const { frame, image } = renderAlbumShell()

    expect(getComputedStyle(frame).aspectRatio).toBe('4 / 3')
    expect(getComputedStyle(image).aspectRatio).toBe('4 / 3')
    expect(getComputedStyle(image).objectFit).toBe('cover')
  })
})
