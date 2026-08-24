'use client'

import type { ChangeEvent } from 'react'
import type { UploadQueueController, UploadStatus } from '@/lib/upload-queue'

type UploadQueueProps = {
  controller: UploadQueueController
  label?: string
  accept?: string
}

const statusLabel: Record<UploadStatus, string> = {
  pending: '等待上传',
  uploading: '上传中',
  done: '上传完成',
  error: '上传失败',
}

export function UploadQueue({
  controller,
  label = '选择文件',
  accept = 'image/*',
}: UploadQueueProps) {
  const pendingCount = controller.items.filter((item) => item.status === 'pending').length
  const uploadingCount = controller.items.filter((item) => item.status === 'uploading').length
  const doneCount = controller.items.filter((item) => item.status === 'done').length
  const errorCount = controller.items.filter((item) => item.status === 'error').length

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    controller.enqueue(files)
    event.target.value = ''
  }

  const summary = [
    pendingCount ? `${pendingCount} 个等待上传` : '',
    uploadingCount ? `${uploadingCount} 个上传中` : '',
    doneCount ? `${doneCount} 个上传完成` : '',
    errorCount ? `${errorCount} 个上传失败` : '',
  ].filter(Boolean).join('，') || '尚未选择文件'

  return (
    <section className="admin-upload-queue" aria-label="上传队列">
      <label className="admin-upload-picker">
        <span>{label}</span>
        <input type="file" accept={accept} multiple onChange={handleFiles} />
      </label>

      <div className="admin-upload-summary" role="status" aria-live="polite">
        {summary}
      </div>

      {controller.items.length > 0 ? (
        <ul className="admin-upload-list">
          {controller.items.map((item) => (
            <li className={`admin-upload-item is-${item.status}`} key={item.id}>
              <div>
                <strong>{item.file.name}</strong>
                <span>{statusLabel[item.status]}{item.status === 'uploading' ? ` ${item.progress}%` : ''}</span>
                {item.error ? <span className="admin-upload-error">{item.error}</span> : null}
              </div>
              <div className="admin-upload-actions">
                {item.status === 'error' ? (
                  <button type="button" onClick={() => controller.retry(item.id)}>
                    重试 {item.file.name}
                  </button>
                ) : null}
                {item.status !== 'uploading' ? (
                  <button type="button" onClick={() => controller.remove(item.id)}>
                    移除 {item.file.name}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="admin-upload-toolbar">
        <button
          type="button"
          disabled={controller.busy || pendingCount === 0}
          onClick={() => void controller.start()}
        >
          {controller.busy ? '正在上传…' : '开始上传'}
        </button>
        {doneCount > 0 ? (
          <button type="button" onClick={controller.clearCompleted}>清理已完成</button>
        ) : null}
      </div>
    </section>
  )
}
