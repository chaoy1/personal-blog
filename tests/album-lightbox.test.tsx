import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import Lightbox from '@/components/Lightbox'

describe('P05 album lightbox navigation', () => {
  afterEach(cleanup)

  it('moves through the current album with buttons and arrow keys', async () => {
    render(
      <>
        <div className="album-grid">
          <figure className="album-item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/one.jpg" alt="第一张" data-lightbox-caption="第一张" data-lightbox-date="2026-09-01" />
          </figure>
          <figure className="album-item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/two.jpg" alt="第二张" data-lightbox-caption="第二张" data-lightbox-date="2026-09-02" />
          </figure>
        </div>
        <Lightbox />
      </>,
    )

    const first = screen.getByRole('img', { name: '第一张' })
    fireEvent.click(first)

    const dialog = await screen.findByRole('dialog', { name: '第一张' })
    expect(screen.getByRole('button', { name: '下一张' })).toBeInTheDocument()
    expect(screen.getByText('01 / 02')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '下一张' }))
    await waitFor(() => expect(within(dialog).getByRole('img', { name: '第二张' })).toHaveAttribute('src', expect.stringContaining('/two.jpg')))
    expect(screen.getByText('02 / 02')).toBeInTheDocument()

    fireEvent.keyDown(dialog, { key: 'ArrowLeft' })
    await waitFor(() => expect(within(dialog).getByRole('img', { name: '第一张' })).toHaveAttribute('src', expect.stringContaining('/one.jpg')))
  })
})
