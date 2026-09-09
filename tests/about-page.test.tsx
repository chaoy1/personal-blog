import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

describe('AboutPage', () => {
  it('uses the flowing calligraphy face only for the about heading copy', () => {
    const layout = readFileSync(resolve(process.cwd(), 'app/layout.tsx'), 'utf8')
    const studio = readFileSync(resolve(process.cwd(), 'app/studio.css'), 'utf8')

    expect(layout).toContain("import '@fontsource/zhi-mang-xing/400.css'")
    expect(studio.match(/"Zhi Mang Xing"/g)).toHaveLength(2)
    expect(studio).not.toContain('"Ma Shan Zheng"')
  })

  it('renders the owner signature with a dedicated brush stroke', async () => {
    render(await AboutPage())

    const colophon = screen.getByRole('complementary', { name: '博主落款' })

    expect(colophon).toHaveClass('about-colophon', 'about-colophon-casual')
    expect(within(colophon).getByText('落款')).toHaveClass('about-colophon-label')
    expect(colophon.querySelector('.about-colophon-rule')).not.toBeInTheDocument()
    expect(within(colophon).getByRole('img', { name: '博主头像' })).toBeInTheDocument()
    expect(within(colophon).getByText('ChoyChou')).toBeInTheDocument()
    expect(within(colophon).getByText('博主 · 似水流年')).toBeInTheDocument()
    expect(within(colophon).getByText('署')).toHaveClass('about-colophon-seal')
    expect(colophon.querySelector('.about-colophon-wash')).toBeInTheDocument()
    expect(colophon.querySelector('.about-colophon-brush')).toBeInTheDocument()
  })
})
