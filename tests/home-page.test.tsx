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

  /** 受控帧队列：由测试决定什么时候前进一帧，避免 rAF 递归把栈打满。 */
  function installFrameQueue() {
    let time = 0
    let nextId = 1
    let queue = new Map<number, FrameRequestCallback>()
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      const id = nextId++
      queue.set(id, cb)
      return id
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
      queue.delete(id)
    })
    return {
      step(ms = 16) {
        time += ms
        const pending = Array.from(queue.entries())
        queue = new Map()
        pending.forEach(([, cb]) => cb(time))
      },
    }
  }

  it('turns the ink ring exactly one full lap per press', () => {
    const frames = installFrameQueue()
    const randomValues = [0, 0.5, 0.99, 0.25]
    let randomCall = 0
    vi.spyOn(Math, 'random').mockImplementation(() => randomValues[randomCall++ % randomValues.length])

    const { container } = render(<DailyQuote />)
    const shuffle = screen.getByRole('button', { name: '换一句，墨线转满一圈' })
    const rotor = container.querySelector<SVGGElement>('.dq-orbit-rotor')!
    const angle = () => Number(/rotate\(([-\d.]+)deg\)/.exec(rotor.style.transform)?.[1] ?? 0)

    frames.step() // 让 rAF 循环挂上
    expect(angle()).toBe(0)

    fireEvent.click(shuffle)
    // 单击走满一圈要用 620ms
    for (let t = 0; t < 700; t += 20) frames.step(20)

    // 一次点击 = 整整 360°，且停在整圈上
    expect(angle()).toBe(360)
    frames.step(20)
    expect(angle()).toBe(360)
  })

  it('speeds up instead of queueing when presses pile up', () => {
    const frames = installFrameQueue()
    // 同前：必须给一组会变的随机值，常量会让「换到不同一句」的 while 卡死
    const randomValues = [0, 0.4, 0.8, 0.2, 0.6, 0.1]
    let randomCall = 0
    vi.spyOn(Math, 'random').mockImplementation(() => randomValues[randomCall++ % randomValues.length])

    const { container } = render(<DailyQuote />)
    const shuffle = screen.getByRole('button', { name: '换一句，墨线转满一圈' })
    const rotor = container.querySelector<SVGGElement>('.dq-orbit-rotor')!
    const angle = () => Number(/rotate\(([-\d.]+)deg\)/.exec(rotor.style.transform)?.[1] ?? 0)

    frames.step()

    // 连点三次都在 320ms 窗口内，所以第三次应当已经进入加速档
    fireEvent.click(shuffle)
    fireEvent.click(shuffle)
    fireEvent.click(shuffle)

    // 累积目标是 3 圈；跑满 1.5s 后必须追上，不留积压
    for (let t = 0; t < 1500; t += 20) frames.step(20)

    expect(angle()).toBe(1080)
  })

  it('still switches to a different quote on every press', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const { container } = render(<DailyQuote />)
    const shuffle = screen.getByRole('button', { name: '换一句，墨线转满一圈' })
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
