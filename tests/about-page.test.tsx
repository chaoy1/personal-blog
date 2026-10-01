import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const supabase = vi.hoisted(() => ({
  maybeSingle: vi.fn().mockResolvedValue({
    data: {
      nickname: 'ChoyChou',
      bio: '你好，我是这间小屋的主人。',
      avatar_url: 'choy.png',
    },
  }),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: supabase.maybeSingle }),
      }),
    }),
  }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))

vi.mock('@/components/ScrollFX', () => ({ default: () => null }))

import AboutPage from '@/app/about/page'

afterEach(cleanup)

beforeEach(() => {
  supabase.maybeSingle.mockReset().mockResolvedValue({
    data: {
      nickname: 'ChoyChou',
      bio: '你好，我是这间小屋的主人。',
      avatar_url: 'choy.png',
    },
  })
})

describe('AboutPage', () => {
  it('exposes the readable profile as a stable page state', async () => {
    render(await AboutPage())

    const page = screen.getByRole('main', { name: '关于' })
    expect(page).toHaveAttribute('data-page-state', 'ready')
    expect(page).toHaveAttribute('data-profile-state', 'ready')
    expect(within(page).getByText('你好，我是这间小屋的主人。')).toBeInTheDocument()
  })

  it('keeps a missing profile composed without inventing a biography', async () => {
    supabase.maybeSingle.mockResolvedValueOnce({ data: null })
    render(await AboutPage())

    const page = screen.getByRole('main', { name: '关于' })
    expect(page).toHaveAttribute('data-page-state', 'empty')
    expect(screen.getByText('这页还没有可展示的自序。')).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: '博主落款' })).not.toBeInTheDocument()
  })

  it('separates a profile load error from an empty profile and offers retry', async () => {
    supabase.maybeSingle.mockRejectedValueOnce(new Error('offline'))
    render(await AboutPage())

    const page = screen.getByRole('main', { name: '关于' })
    expect(page).toHaveAttribute('data-page-state', 'error')
    expect(screen.getByRole('alert')).toHaveTextContent('关于页暂时未能载入。')
    expect(screen.getByRole('link', { name: '重试关于页' })).toHaveAttribute('href', '/about')
  })

  it('uses the shared restrained navigation treatment', async () => {
    render(await AboutPage())

    const navigation = screen.getByRole('navigation', { name: '关于页导航' })

    expect(within(navigation).getByRole('link', { name: '返回首页' })).toHaveClass('article-nav-home')
    expect(within(navigation).getByText('返回首页', { exact: true })).toHaveClass('article-nav-label')
    expect(within(navigation).getByText('关于', { exact: true })).toHaveClass('article-nav-label')
    expect(navigation.querySelector('.article-nav-paper')).not.toBeInTheDocument()
  })

  it('keeps display type separate from the readable prose', () => {
    const layout = readFileSync(resolve(process.cwd(), 'app/layout.tsx'), 'utf8')
    const styles = readFileSync(resolve(process.cwd(), 'app/about/about.css'), 'utf8')

    expect(layout).toContain("import '@fontsource/zhi-mang-xing/400.css'")
    expect(styles).toContain("--brush: 'hongleixingshu'")
    expect(styles).toMatch(/\.about-preface-prose\s*\{[^}]*var\(--song\)/)
  })

  it('uses saved owner details in the photo and signature', async () => {
    render(await AboutPage())

    const colophon = screen.getByRole('complementary', { name: '博主落款' })

    expect(within(colophon).getByRole('img', { name: '博主头像' })).toBeInTheDocument()
    expect(within(colophon).getByRole('img', { name: '博主头像' })).not.toHaveAttribute('src', expect.stringContaining('undefined'))
    expect(within(colophon).getByRole('img', { name: '博主头像' })).not.toHaveAttribute('src', expect.stringContaining('undefined'))
    expect(within(colophon).getByText('ChoyChou')).toBeInTheDocument()
    expect(within(colophon).getByText('博主 · 似水流年')).toBeInTheDocument()
    expect(within(colophon).getByText('小屋主人')).toBeInTheDocument()
    expect(screen.getByLabelText('关于页落款')).toHaveTextContent('ChoyChou')
  })

  it('offers the confirmed collection and guestbook destinations with no chapter index', async () => {
    render(await AboutPage())
    const records = screen.getByLabelText('小屋里的记录')
    expect(within(records).getByRole('link', { name: /文章/ })).toHaveAttribute('href', '/posts')
    expect(within(records).getByRole('link', { name: /闲语/ })).toHaveAttribute('href', '/moments')
    expect(within(records).getByRole('link', { name: /光影/ })).toHaveAttribute('href', '/album')
    expect(screen.getByRole('link', { name: /去山窗/ })).toHaveAttribute('href', '/guestbook')
    expect(screen.queryByRole('navigation', { name: '卷中索引' })).not.toBeInTheDocument()
  })

  it('reports an API error response as a failure rather than an empty biography', async () => {
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'offline' } })
    render(await AboutPage())
    expect(screen.getByRole('main', { name: '关于' })).toHaveAttribute('data-profile-state', 'error')
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
