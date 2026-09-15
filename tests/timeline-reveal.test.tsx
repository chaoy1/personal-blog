import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}))

import TimelineReveal from '@/components/TimelineReveal'

const entries = [
  {
    key: 'post-2026',
    type: 'post' as const,
    title: '桥边晚照',
    excerpt: '天色收拢，灯影刚好。',
    href: '/posts/bridge-evening',
    created_at: '2026-09-03T08:00:00Z',
  },
  {
    key: 'moment-2025',
    type: 'moment' as const,
    title: '闲语',
    excerpt: '沿着溪声走进一页春山。',
    href: '/moments',
    created_at: '2025-07-02T08:00:00Z',
  },
]

describe('P06 timeline reveal states', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    cleanup()
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('reveals one year at a time and ends with an explicit colophon', async () => {
    render(<TimelineReveal entries={entries} />)

    expect(screen.getByRole('heading', { name: '2026' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '2025' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '续展旧卷' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: '2025' })).toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('status', { name: '时间轴已到卷尾' })).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: '续展旧卷' })).not.toBeInTheDocument()
  })
})
