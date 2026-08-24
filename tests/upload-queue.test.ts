import { act, cleanup, render, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type UploadQueueController, useUploadQueue } from '@/lib/upload-queue'

function QueueProbe({ onReady }: { onReady: (controller: UploadQueueController) => void }) {
  onReady(useUploadQueue({ bucket: 'images', concurrency: 2 }))
  return null
}

function createFile(name: string) {
  return new File(['file contents'], name, { type: 'image/png' })
}

function renderQueue() {
  let controller: UploadQueueController | undefined
  render(createElement(QueueProbe, { onReady: (nextController) => { controller = nextController } }))
  return {
    get controller() {
      if (!controller) throw new Error('Queue controller was not rendered')
      return controller
    },
  }
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

describe('useUploadQueue', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('uploads enqueued files in their original order with bucket form data', async () => {
    const fetchMock = vi.mocked(fetch).mockImplementation(async (_url, init) => {
      const body = init?.body as FormData
      expect(body.get('bucket')).toBe('images')
      return { ok: true, json: async () => ({ url: `/uploads/${body.get('file') instanceof File ? (body.get('file') as File).name : ''}` }) } as Response
    })
    const queue = renderQueue()
    const first = createFile('first.png')
    const second = createFile('second.png')

    act(() => queue.controller.enqueue([first, second]))
    await waitFor(() => expect(queue.controller.items).toHaveLength(2))

    await act(async () => { await queue.controller.start() })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(queue.controller.items.map((item) => item.file.name)).toEqual(['first.png', 'second.png'])
    expect(queue.controller.items.map((item) => item.status)).toEqual(['done', 'done'])
    expect(queue.controller.items.map((item) => item.url)).toEqual(['/uploads/first.png', '/uploads/second.png'])
  })

  it('runs no more than the configured number of uploads at once', async () => {
    const first = deferred<Response>()
    const second = deferred<Response>()
    const third = deferred<Response>()
    const requests = [first, second, third]
    const fetchMock = vi.mocked(fetch).mockImplementation(() => requests.shift()!.promise)
    const queue = renderQueue()

    act(() => queue.controller.enqueue([createFile('one.png'), createFile('two.png'), createFile('three.png')]))
    await waitFor(() => expect(queue.controller.items).toHaveLength(3))
    const startPromise = queue.controller.start()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    first.resolve({ ok: true, json: async () => ({ url: '/uploads/one.png' }) } as Response)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    second.resolve({ ok: true, json: async () => ({ url: '/uploads/two.png' }) } as Response)
    third.resolve({ ok: true, json: async () => ({ url: '/uploads/three.png' }) } as Response)

    await act(async () => { await startPromise })
    expect(queue.controller.items.map((item) => item.status)).toEqual(['done', 'done', 'done'])
  })

  it('records success URLs and error messages per item', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: '/uploads/ok.png' }) } as Response)
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'File too large' }) } as Response)
    const queue = renderQueue()

    act(() => queue.controller.enqueue([createFile('ok.png'), createFile('bad.png')]))
    await waitFor(() => expect(queue.controller.items).toHaveLength(2))
    await act(async () => { await queue.controller.start() })

    expect(queue.controller.items.map((item) => ({ status: item.status, url: item.url, error: item.error }))).toEqual([
      { status: 'done', url: '/uploads/ok.png', error: undefined },
      { status: 'error', url: undefined, error: 'File too large' },
    ])
  })

  it('does not upload an item removed before start', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ url: '/uploads/kept.png' }) } as Response)
    const queue = renderQueue()

    act(() => queue.controller.enqueue([createFile('removed.png'), createFile('kept.png')]))
    await waitFor(() => expect(queue.controller.items).toHaveLength(2))
    act(() => queue.controller.remove(queue.controller.items[0].id))
    await waitFor(() => expect(queue.controller.items).toHaveLength(1))
    await act(async () => { await queue.controller.start() })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(queue.controller.items).toMatchObject([{ file: expect.objectContaining({ name: 'kept.png' }), status: 'done' }])
  })

  it('retries only the failed item without discarding successful items', async () => {
    const fetchMock = vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: '/uploads/complete.png' }) } as Response)
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Temporary failure' }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: '/uploads/retry.png' }) } as Response)
    const queue = renderQueue()

    act(() => queue.controller.enqueue([createFile('complete.png'), createFile('retry.png')]))
    await waitFor(() => expect(queue.controller.items).toHaveLength(2))
    await act(async () => { await queue.controller.start() })
    const failed = queue.controller.items.find((item) => item.status === 'error')!

    act(() => queue.controller.retry(failed.id))
    await waitFor(() => expect(queue.controller.items.find((item) => item.id === failed.id)?.status).toBe('pending'))
    await act(async () => { await queue.controller.start() })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(queue.controller.items.map((item) => ({ name: item.file.name, status: item.status }))).toEqual([
      { name: 'complete.png', status: 'done' },
      { name: 'retry.png', status: 'done' },
    ])
  })
})
