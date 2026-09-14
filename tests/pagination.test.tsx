import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Pagination from '@/components/Pagination'

afterEach(cleanup)

describe('Pagination', () => {
  it('hides controls for a single page', () => {
    render(<Pagination page={1} totalPages={1} totalItems={3} onPageChange={vi.fn()} />)

    expect(screen.queryByRole('navigation', { name: '分页' })).not.toBeInTheDocument()
  })

  it('exposes stable summary and disables the edge control', () => {
    render(<Pagination page={1} totalPages={3} totalItems={25} onPageChange={vi.fn()} />)

    expect(screen.getByRole('navigation', { name: '分页' })).toBeInTheDocument()
    expect(screen.getByText('第 1 / 3 页 · 共 25 条')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '← 上一页' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '下一页 →' })).toBeEnabled()
  })

  it('emits the next and previous pages through native keyboard buttons', () => {
    const onPageChange = vi.fn()
    const { rerender } = render(
      <Pagination page={2} totalPages={3} totalItems={25} onPageChange={onPageChange} />,
    )

    fireEvent.keyDown(screen.getByRole('button', { name: '下一页 →' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('button', { name: '下一页 →' }))
    fireEvent.click(screen.getByRole('button', { name: '← 上一页' }))
    expect(onPageChange).toHaveBeenNthCalledWith(1, 3)
    expect(onPageChange).toHaveBeenNthCalledWith(2, 1)

    rerender(<Pagination page={4} totalPages={3} totalItems={25} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByRole('button', { name: '← 上一页' }))
    expect(onPageChange).toHaveBeenLastCalledWith(2)
  })
})
