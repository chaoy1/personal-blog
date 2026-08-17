import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import Lightbox from '@/components/Lightbox'
import MarkdownView from '@/components/MarkdownView'
import ReadingCompanion from '@/components/ReadingCompanion'

describe('reading UI accessibility', () => {
  afterEach(cleanup)

  it('exposes reading progress as text', () => {
    render(<ReadingCompanion />)

    expect(screen.getByRole('progressbar', { name: '阅读进度' })).toHaveAttribute('aria-valuetext', '已读 0%')
  })

  it('places Markdown tables in a labelled scroll region', () => {
    render(<MarkdownView content={'| 名称 | 内容 |\n| --- | --- |\n| 千里江山 | 长卷 |'} />)

    expect(within(screen.getByRole('region', { name: '文章表格，可横向滚动' })).getByRole('table')).toBeInTheDocument()
  })

  it('restores focus to the image that opened the Lightbox after Escape', async () => {
    render(
      <>
        <div className="md-body">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/example.jpg" alt="示例图" tabIndex={0} />
        </div>
        <Lightbox />
      </>,
    )
    const image = screen.getByRole('img', { name: '示例图' })
    image.focus()

    fireEvent.click(image)
    await waitFor(() => expect(screen.getByRole('dialog', { name: '示例图' })).toBeInTheDocument())
    screen.getByRole('button', { name: '关闭' }).focus()
    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => expect(image).toHaveFocus())
  })
})
