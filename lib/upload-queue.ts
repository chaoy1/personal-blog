import { useCallback, useRef, useState } from 'react'

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error'

export type UploadItem = {
  id: string
  file: File
  status: UploadStatus
  progress: number
  url?: string
  error?: string
}

export type UploadQueueController = {
  items: UploadItem[]
  busy: boolean
  enqueue(files: File[]): void
  remove(id: string): void
  retry(id: string): void
  start(): Promise<UploadItem[]>
  clearCompleted(): void
}

type UploadQueueOptions = {
  bucket: string
  concurrency?: number
}

let uploadId = 0

function nextUploadId() {
  uploadId += 1
  return `upload-${Date.now()}-${uploadId}`
}

export function useUploadQueue({
  bucket,
  concurrency = 2,
}: UploadQueueOptions): UploadQueueController {
  const [items, setItems] = useState<UploadItem[]>([])
  const itemsRef = useRef<UploadItem[]>([])
  const runningRef = useRef<Promise<UploadItem[]> | null>(null)
  const limit = Math.max(1, Math.floor(concurrency))

  const updateItems = useCallback((update: (current: UploadItem[]) => UploadItem[]) => {
    setItems((current) => {
      const next = update(current)
      itemsRef.current = next
      return next
    })
  }, [])

  const enqueue = useCallback((files: File[]) => {
    if (!files.length) return
    updateItems((current) => [
      ...current,
      ...files.map((file) => ({
        id: nextUploadId(),
        file,
        status: 'pending' as const,
        progress: 0,
      })),
    ])
  }, [updateItems])

  const remove = useCallback((id: string) => {
    updateItems((current) => current.filter((item) => item.id !== id || item.status === 'uploading'))
  }, [updateItems])

  const retry = useCallback((id: string) => {
    updateItems((current) => current.map((item) => (
      item.id === id && item.status === 'error'
        ? { ...item, status: 'pending', progress: 0, url: undefined, error: undefined }
        : item
    )))
  }, [updateItems])

  const clearCompleted = useCallback(() => {
    updateItems((current) => current.filter((item) => item.status !== 'done'))
  }, [updateItems])

  const uploadOne = useCallback(async (id: string) => {
    const item = itemsRef.current.find((candidate) => candidate.id === id)
    if (!item || item.status !== 'pending') return

    updateItems((current) => current.map((candidate) => (
      candidate.id === id ? { ...candidate, status: 'uploading', progress: 0, error: undefined } : candidate
    )))

    try {
      const form = new FormData()
      form.append('bucket', bucket)
      form.append('file', item.file)
      const response = await fetch('/api/admin/upload', { method: 'POST', body: form })
      const payload = await response.json().catch(() => ({})) as { url?: unknown; error?: unknown; message?: unknown }
      if (!response.ok) {
        const message = typeof payload.error === 'string'
          ? payload.error
          : typeof payload.message === 'string' ? payload.message : '上传失败'
        throw new Error(message)
      }
      if (typeof payload.url !== 'string' || !payload.url) throw new Error('上传响应缺少图片地址')
      const uploadedUrl = payload.url
      updateItems((current) => current.map((candidate) => (
        candidate.id === id
          ? { ...candidate, status: 'done', progress: 100, url: uploadedUrl, error: undefined }
          : candidate
      )))
    } catch (error) {
      updateItems((current) => current.map((candidate) => (
        candidate.id === id
          ? {
              ...candidate,
              status: 'error',
              progress: 0,
              url: undefined,
              error: error instanceof Error ? error.message : '上传失败',
            }
          : candidate
      )))
    }
  }, [bucket, updateItems])

  const start = useCallback(() => {
    if (runningRef.current) return runningRef.current
    let run: Promise<UploadItem[]>
    run = (async () => {
      const pendingIds = itemsRef.current
        .filter((item) => item.status === 'pending')
        .map((item) => item.id)
      let cursor = 0
      const worker = async () => {
        while (cursor < pendingIds.length) {
          const id = pendingIds[cursor]
          cursor += 1
          await uploadOne(id)
        }
      }
      await Promise.all(
        Array.from({ length: Math.min(limit, pendingIds.length) }, () => worker()),
      )
      return itemsRef.current
    })().finally(() => {
      if (runningRef.current === run) runningRef.current = null
    })
    runningRef.current = run
    return run
  }, [limit, uploadOne])

  return {
    items,
    busy: items.some((item) => item.status === 'uploading'),
    enqueue,
    remove,
    retry,
    start,
    clearCompleted,
  }
}
