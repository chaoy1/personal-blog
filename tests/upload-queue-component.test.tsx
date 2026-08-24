import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UploadQueue } from '@/components/admin/UploadQueue'
import type { UploadQueueController } from '@/lib/upload-queue'

afterEach(cleanup)

function controller(overrides: Partial<UploadQueueController> = {}): UploadQueueController {
  return {
    items: [],
    busy: false,
    enqueue: vi.fn(),
    remove: vi.fn(),
    retry: vi.fn(),
    start: vi.fn().mockResolvedValue([]),
    clearCompleted: vi.fn(),
    ...overrides,
  }
}

describe('UploadQueue', () => {
  it('queues selected files and exposes upload controls', () => {
    const pending = new File(['queued'], 'queued.jpg', { type: 'image/jpeg' })
    const value = controller({
      items: [
        { id: 'pending', file: pending, status: 'pending', progress: 0 },
      ],
    })
    render(<UploadQueue controller={value} label="选择照片" />)

    const file = new File(['photo'], 'ridge.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('选择照片'), { target: { files: [file] } })

    expect(value.enqueue).toHaveBeenCalledWith([file])
    fireEvent.click(screen.getByRole('button', { name: '开始上传' }))
    expect(value.start).toHaveBeenCalledTimes(1)
  })

  it('announces item status and preserves failed items for retry', () => {
    const failed = new File(['bad'], 'broken.jpg', { type: 'image/jpeg' })
    const done = new File(['good'], 'ready.jpg', { type: 'image/jpeg' })
    const value = controller({
      items: [
        { id: 'failed', file: failed, status: 'error', progress: 0, error: '网络错误' },
        { id: 'done', file: done, status: 'done', progress: 100, url: '/ready.jpg' },
      ],
    })

    render(<UploadQueue controller={value} />)

    const live = screen.getByRole('status')
    expect(live).toHaveTextContent('1 个上传失败')
    expect(screen.getByText('网络错误')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '重试 broken.jpg' }))
    expect(value.retry).toHaveBeenCalledWith('failed')

    fireEvent.click(screen.getByRole('button', { name: '清理已完成' }))
    expect(value.clearCompleted).toHaveBeenCalledTimes(1)
    expect(screen.getByText('broken.jpg')).toBeInTheDocument()
  })
})
