import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import MarkdownView from '@/components/MarkdownView'
import ReadingCompanion from '@/components/ReadingCompanion'

afterEach(cleanup)

describe('P03 reading detail', () => {
  it('gives Markdown headings stable ids and disambiguates repeated titles', () => {
    render(
      <MarkdownView
        content={'## 走进山中\n\n正文\n\n### 同一节\n\n正文\n\n## 走进山中\n\n正文'}
      />,
    )

    const repeatedHeadings = screen.getAllByRole('heading', { level: 2, name: '走进山中' })
    expect(repeatedHeadings[0]).toHaveAttribute('id', '走进山中')
    expect(screen.getByRole('heading', { level: 3, name: '同一节' })).toHaveAttribute('id', '同一节')
    expect(repeatedHeadings[1]).toHaveAttribute('id', '走进山中-2')
  })

  it('keeps those ids identical when React renders the tree twice', () => {
    // reactStrictMode 会重跑一次渲染；标题 id 必须由内容决定，不能依赖渲染次数。
    render(
      <StrictMode>
        <MarkdownView content={'## 走进山中\n\n正文\n\n### 同一节\n\n正文\n\n## 走进山中\n\n正文'} />
      </StrictMode>,
    )

    const repeatedHeadings = screen.getAllByRole('heading', { level: 2, name: '走进山中' })
    expect(repeatedHeadings[0]).toHaveAttribute('id', '走进山中')
    expect(screen.getByRole('heading', { level: 3, name: '同一节' })).toHaveAttribute('id', '同一节')
    expect(repeatedHeadings[1]).toHaveAttribute('id', '走进山中-2')
  })

  it('marks the active chapter and exposes a compact directory for narrow screens', async () => {
    render(
      <div className="article-reading-shell">
        <article className="article">
          <div className="md-body">
            <h2 id="opening">开篇</h2>
            <h3 id="walk">行路</h3>
          </div>
        </article>
        <ReadingCompanion />
      </div>,
    )

    await waitFor(() => expect(screen.getByRole('navigation', { name: '文章目录' })).toBeInTheDocument())

    const rail = document.querySelector('.reading-companion-rail')!
    const railLinks = rail.querySelectorAll('a')
    expect(railLinks).toHaveLength(2)
    expect(railLinks[1]).toHaveAttribute('aria-current', 'location')
    expect(document.querySelector('.reading-companion-compact')).toBeInTheDocument()
  })
})
