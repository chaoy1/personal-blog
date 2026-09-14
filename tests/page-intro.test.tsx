import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import PageIntro from '@/components/PageIntro'

afterEach(cleanup)

const props = {
  index: '一',
  eyebrow: 'COLLECTED NOTES',
  title: '文章',
  seal: '文',
  description: '记录阅读与思考。',
}

describe('PageIntro variants', () => {
  it('uses standard as the default variant', () => {
    render(<PageIntro {...props} />)
    expect(screen.getByRole('heading', { name: '文章' }).parentElement?.parentElement).toHaveClass(
      'page-intro',
      'page-intro--standard',
    )
  })

  it.each(['display', 'compact'] as const)('exposes the %s variant class', (variant) => {
    render(<PageIntro {...props} variant={variant} />)
    expect(screen.getByRole('heading', { name: '文章' }).parentElement?.parentElement).toHaveClass(
      'page-intro',
      `page-intro--${variant}`,
    )
  })
})
