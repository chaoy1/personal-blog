import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import MarkdownExcerpt from '@/components/MarkdownExcerpt'

afterEach(cleanup)

it('renders Markdown summaries inside a card link without nested anchors or block elements', () => {
  const { container } = render(<a href="/posts/example"><MarkdownExcerpt content={'## 山窗\n\n**茶香**与[晚风](https://example.com)\n\n- 一页书\n\n![配图](/image.jpg)'} /></a>)
  expect(container.textContent).toContain('茶香与晚风')
  expect(container.querySelector('strong')).toHaveTextContent('茶香')
  expect(container.querySelectorAll('a')).toHaveLength(1)
  expect(container.querySelector('p, h2, ul, li, img')).toBeNull()
  expect(container.textContent).not.toContain('##')
})

it('omits footnote sections from inline summaries used inside paragraphs', () => {
  const { container } = render(<p><MarkdownExcerpt content={'山窗[^1]\n\n[^1]: 一页旧事'} /></p>)
  expect(container.textContent).toContain('山窗')
  expect(container.querySelector('section, h2, a, p p')).toBeNull()
  expect(container.textContent).not.toContain('一页旧事')
})
