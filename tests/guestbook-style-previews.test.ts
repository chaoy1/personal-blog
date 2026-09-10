import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const previews = [
  ['letters', 'guestbook-a-letters.html', '尺素来书'],
  ['window', 'guestbook-b-window.html', '山窗寄语'],
  ['station', 'guestbook-c-station.html', '朱印驿站'],
] as const

describe('guestbook style previews', () => {
  test.each(previews)('%s is a complete, navigable guestbook prototype', (style, filename, label) => {
    const html = readFileSync(resolve(process.cwd(), 'effect-preview', filename), 'utf8')
    const page = new DOMParser().parseFromString(html, 'text/html')

    expect(page.documentElement.lang).toBe('zh-CN')
    expect(page.querySelector('meta[name="viewport"]')?.getAttribute('content')).toContain('width=device-width')
    expect(page.body.dataset.preview).toBe(style)
    expect(page.querySelector('main')).not.toBeNull()
    expect(page.querySelector('h1')?.textContent).toContain('留言')
    expect(page.querySelector('[aria-label="写留言"]')).not.toBeNull()
    expect(page.querySelectorAll('article[aria-label="留言"]')).toHaveLength(3)
    expect(page.querySelector('link[rel="stylesheet"]')?.getAttribute('href')).toBe('guestbook-preview.css')
    expect(page.querySelector('.brand')?.getAttribute('href')).toBe('/')
    expect(page.querySelector('.crumbs a')?.getAttribute('href')).toBe('/')
    expect(page.querySelectorAll('time[datetime]')).toHaveLength(3)

    const switcher = page.querySelector('[aria-label="留言页风格方案"]')
    const switcherText = switcher?.textContent ?? ''
    expect(switcherText).toContain(label)
    const links = Array.from(switcher?.querySelectorAll('a') ?? [])
    expect(links.map((link) => link.getAttribute('href'))).toEqual(previews.map(([, href]) => href))
    expect(links.filter((link) => link.getAttribute('aria-current') === 'page')).toHaveLength(1)
    expect(links.find((link) => link.getAttribute('aria-current') === 'page')?.getAttribute('href')).toBe(filename)
  })
})
