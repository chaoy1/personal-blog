import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

  it('makes real Markdown images keyboard-focusable and opens them with Enter or Space', async () => {
    render(
      <>
        <MarkdownView content="![示例图](/example.jpg)" />
        <Lightbox />
      </>,
    )
    const image = screen.getByRole('img', { name: '示例图' })

    await waitFor(() => expect(image).toHaveAttribute('tabindex', '0'))
    image.focus()
    fireEvent.keyDown(image, { key: 'Enter' })
    await waitFor(() => expect(screen.getByRole('button', { name: '关闭' })).toHaveFocus())

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(image).toHaveFocus())
    fireEvent.keyDown(image, { key: ' ' })
    await waitFor(() => expect(screen.getByRole('button', { name: '关闭' })).toHaveFocus())
  })

  it('moves focus into the Lightbox and keeps Tab in the modal', async () => {
    render(
      <>
        <div className="md-body">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/example.jpg" alt="示例图" />
        </div>
        <button type="button">背景操作</button>
        <Lightbox />
      </>,
    )
    const image = screen.getByRole('img', { name: '示例图' })
    fireEvent.click(image)

    const closeButton = await screen.findByRole('button', { name: '关闭' })
    await waitFor(() => expect(closeButton).toHaveFocus())

    fireEvent.keyDown(closeButton, { key: 'Tab' })
    expect(closeButton).toHaveFocus()
    fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true })
    expect(closeButton).toHaveFocus()

    screen.getByRole('button', { name: '背景操作' }).focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(closeButton).toHaveFocus()
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

  it('leaves current focus alone when Escape is pressed after the Lightbox closes', async () => {
    render(
      <>
        <div className="md-body">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/example.jpg" alt="示例图" tabIndex={0} />
        </div>
        <button type="button">继续阅读</button>
        <Lightbox />
      </>,
    )
    const image = screen.getByRole('img', { name: '示例图' })
    const continueReading = screen.getByRole('button', { name: '继续阅读' })

    fireEvent.click(image)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(image).toHaveFocus())

    continueReading.focus()
    fireEvent.keyDown(window, { key: 'Escape' })
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    expect(continueReading).toHaveFocus()
  })

  it('restores focus once when the Lightbox close button is clicked', async () => {
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
    fireEvent.click(image)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    const focus = vi.spyOn(image, 'focus')

    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    expect(focus).toHaveBeenCalledTimes(1)
    expect(image).toHaveFocus()
  })
})
