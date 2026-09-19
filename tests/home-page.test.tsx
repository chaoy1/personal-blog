import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import DailyQuote from '@/components/DailyQuote'
import HomeHero from '@/components/home/HomeHero'
import HomePreviews from '@/components/home/HomePreviews'

const post = {
  id: 'post-1',
  title: '山中一日',
  slug: 'a-day-in-the-mountains',
  excerpt: '沿着溪声走进一页春山。',
  content: '正文',
  published: true,
  created_at: '2026-09-01T08:00:00Z',
  updated_at: '2026-09-01T08:00:00Z',
}

const photo = {
  id: 'photo-1',
  url: '/photo.jpg',
  caption: '桥边晚照',
  created_at: '2026-09-02T08:00:00Z',
}

const guestbookEntry = {
  id: 'guestbook-1',
  user_id: 'visitor-1',
  content: '从山水间路过，留下问候。',
  parent_id: null,
  created_at: '2026-09-03T08:00:00Z',
  profiles: { nickname: '旅人', avatar_url: '' },
}

describe('P01 home page composition', () => {
  beforeEach(() => {
    // 换句钮要读 prefers-reduced-motion；jsdom 默认没有 matchMedia。
    // 注意：不能写成 stubGlobal('matchMedia', …) 再把它赋给 window.matchMedia，
    // 那样等于让 window.matchMedia 指向自己，调用时会无限递归直到耗尽内存。
    const { matchMedia } = window as unknown as { matchMedia?: unknown }
    if (typeof matchMedia !== 'function') {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }))
    }
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('gives every press its own spin instead of restarting one full turn', () => {
    // 不模拟 rAF 时序：点击处理函数本身就应当立刻推动指针，
    // 连点的连续加减速在浏览器里实测（见 effect-preview 说明）。
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    // 注意：不能返回常量 —— 换句逻辑要一直抽到「与当前不同」的那条，
    // 常量会让它的 while 永不退出。
    const randomValues = [0, 0.5, 0.99, 0.25]
    let randomCall = 0
    vi.spyOn(Math, 'random').mockImplementation(() => randomValues[randomCall++ % randomValues.length])

    const { container } = render(<DailyQuote />)
    const shuffle = screen.getByRole('button', { name: '随机换一句' })
    const rotor = container.querySelector<SVGGElement>('.dq-orbit-rotor')!

    const angle = () => Number(/rotate\(([-\d.]+)deg\)/.exec(rotor.style.transform)?.[1] ?? 0)
    const turns = () => Number(rotor.style.getPropertyValue('--dq-turns'))

    // 连点三次：每次只加一次速度，累计远小于「每点一次转一整圈」的 3 圈
    fireEvent.click(shuffle)
    fireEvent.click(shuffle)
    fireEvent.click(shuffle)

    expect(angle()).toBeGreaterThan(0)
    expect(turns()).toBeCloseTo(angle() / 360, 5)
    expect(turns()).toBeLessThan(1)
    // 已经在转：按钮把旋转状态暴露给样式，供节流后的外部提示使用
    expect(shuffle).toHaveAttribute('data-spinning', 'true')
  })

  it('still switches to a different quote on every press', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const { container } = render(<DailyQuote />)
    const shuffle = screen.getByRole('button', { name: '随机换一句' })
    const before = container.querySelector('.dq-text')!.textContent

    fireEvent.click(shuffle)

    expect(container.querySelector('.dq-text')!.textContent).not.toBe(before)
  })

  it('keeps one primary title and exposes the three content statistics as a labelled navigation', () => {
    const { container } = render(<HomeHero postCount={12} momentCount={4} photoCount={8} />)

    expect(screen.getByRole('heading', { level: 1, name: '似 水 流 年' })).toBeInTheDocument()
    expect(container.querySelector('.branch svg')).toBeInTheDocument()
    // V2 首屏：笔触换成标题背后的远山与云气纹样，两侧题签换成卷轴题签。
    expect(container.querySelector('.title-landscape svg')).toBeInTheDocument()
    expect(container.querySelector('.motif svg')).toBeInTheDocument()
    const motifClouds = container.querySelectorAll<SVGPathElement>('.motif-cloud')
    expect(motifClouds[1]).toHaveAttribute('d', expect.stringContaining('M335 20 H279'))
    expect(motifClouds[1]).toHaveAttribute('d', expect.stringContaining('269 22 H219'))
    expect(container.querySelector('.seal')).toHaveTextContent('记')
    expect(container.querySelectorAll('.inscription')).toHaveLength(2)
    expect(container.querySelectorAll('.hero-leaf')).toHaveLength(4)

    const overview = screen.getByRole('navigation', { name: '站点内容概览' })
    const stats = within(overview).getAllByRole('link')
    expect(within(overview).getByRole('link', { name: /12\s*文章/ })).toHaveAttribute('href', '/posts')
    expect(within(overview).getByRole('link', { name: /4\s*闲语/ })).toHaveAttribute('href', '/moments')
    expect(within(overview).getByRole('link', { name: /8\s*光影/ })).toHaveAttribute('href', '/album')
    for (const link of stats) {
      expect(link).toHaveClass('home-stat-link', 'button-hit-area')
      // 每枚卷目都带一道墨圈与英文标注，作为设计稿的目录刻度。
      expect(link.querySelector('.ink-ring')).toBeInTheDocument()
    }
    expect(stats.map((link) => link.querySelector('.hs-latin')?.textContent)).toEqual([
      'POSTS',
      'NOTES',
      'FRAMES',
    ])

    expect(screen.getByRole('button', { name: '向下浏览首页内容' })).toBeInTheDocument()
  })

  it('keeps successful previews visible and binds a failed resource to its own section', () => {
    render(
      <HomePreviews
        posts={[post]}
        moments={[]}
        photos={[photo]}
        guestbook={[guestbookEntry]}
        errors={{ moments: '闲语暂时未能载入。' }}
      />,
    )

    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      '文章更多 →',
      '闲语更多 →',
      '光影更多 →',
      '留言更多 →',
    ])
    expect(screen.getByRole('link', { name: /山中一日/ })).toHaveAttribute(
      'href',
      '/posts/a-day-in-the-mountains',
    )
    expect(screen.getByRole('link', { name: /桥边晚照/ })).toHaveAttribute('href', '/album')
    expect(screen.getByRole('link', { name: /从山水间路过/ })).toHaveAttribute('href', '/guestbook')

    const feedback = screen.getByRole('alert')
    expect(feedback).toHaveTextContent('闲语暂时未能载入。')
    expect(feedback.closest('[data-home-section]')).toHaveAttribute('data-home-section', 'moments')
  })

  it('renders one shared empty state when every homepage resource is empty', () => {
    render(
      <HomePreviews
        posts={[]}
        moments={[]}
        photos={[]}
        guestbook={[]}
        errors={{ posts: undefined, moments: undefined, photos: undefined, guestbook: undefined }}
      />,
    )

    expect(screen.getByText('长卷尚待落墨')).toBeInTheDocument()
    expect(screen.getAllByText('空')).toHaveLength(1)
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })
})
