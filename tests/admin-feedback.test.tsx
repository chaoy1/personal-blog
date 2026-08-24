import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminFeedbackProvider, useAdminFeedback } from '@/components/admin/AdminFeedback'

function FeedbackProbe() {
  const { notify } = useAdminFeedback()

  return (
    <>
      <button onClick={() => notify({ kind: 'success', message: '已保存' })}>显示成功</button>
      <button onClick={() => notify({ kind: 'info', message: '正在同步' })}>显示提示</button>
      <button onClick={() => notify({ kind: 'error', message: '保存失败' })}>显示错误</button>
    </>
  )
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('AdminFeedbackProvider', () => {
  it('renders a success notification as a polite live notice', () => {
    render(
      <AdminFeedbackProvider>
        <FeedbackProbe />
      </AdminFeedbackProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '显示成功' }))

    expect(screen.getByRole('status')).toHaveTextContent('已保存')
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })

  it('auto-dismisses success and info notices after 5 seconds', () => {
    vi.useFakeTimers()
    render(
      <AdminFeedbackProvider>
        <FeedbackProbe />
      </AdminFeedbackProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '显示成功' }))
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '显示提示' }))
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('keeps errors visible until dismissed explicitly', () => {
    vi.useFakeTimers()
    render(
      <AdminFeedbackProvider>
        <FeedbackProbe />
      </AdminFeedbackProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '显示错误' }))
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByRole('alert')).toHaveTextContent('保存失败')

    fireEvent.click(screen.getByRole('button', { name: '关闭通知' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
