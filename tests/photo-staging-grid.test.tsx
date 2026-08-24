import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PhotoStagingGrid } from '@/components/admin/PhotoStagingGrid'
import type { UploadQueueController } from '@/lib/upload-queue'

afterEach(cleanup)

describe('PhotoStagingGrid', () => {
  it('shows selected files before upload with per-item caption and album controls', () => {
    const file = new File(['photo'], 'mist.jpg', { type: 'image/jpeg' })
    const controller: UploadQueueController = {
      items: [{ id: 'one', file, status: 'pending', progress: 0 }],
      busy: false,
      enqueue: vi.fn(),
      remove: vi.fn(),
      retry: vi.fn(),
      start: vi.fn().mockResolvedValue([]),
      clearCompleted: vi.fn(),
    }
    const onMetadata = vi.fn()

    render(
      <PhotoStagingGrid
        controller={controller}
        albums={[{ id: 'album-1', title: '江南' }]}
        metadata={{ one: { caption: '', albumId: '' } }}
        onMetadata={onMetadata}
      />,
    )

    expect(screen.getAllByText('mist.jpg').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: '开始上传' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('照片说明'), { target: { value: '晨雾' } })
    expect(onMetadata).toHaveBeenCalledWith('one', { caption: '晨雾', albumId: '' })
    fireEvent.change(screen.getByLabelText('存入相册'), { target: { value: 'album-1' } })
    expect(onMetadata).toHaveBeenCalledWith('one', { caption: '', albumId: 'album-1' })
  })

  it('keeps per-item persistence errors visible', () => {
    const file = new File(['photo'], 'broken.jpg', { type: 'image/jpeg' })
    const controller: UploadQueueController = {
      items: [{ id: 'broken', file, status: 'done', progress: 100, url: '/broken.jpg' }],
      busy: false,
      enqueue: vi.fn(),
      remove: vi.fn(),
      retry: vi.fn(),
      start: vi.fn().mockResolvedValue([]),
      clearCompleted: vi.fn(),
    }

    render(
      <PhotoStagingGrid
        controller={controller}
        albums={[]}
        metadata={{ broken: { caption: '', albumId: '' } }}
        errors={{ broken: '保存记录失败' }}
        onMetadata={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('保存记录失败')
    expect(screen.getAllByText('broken.jpg').length).toBeGreaterThan(0)
  })
})
