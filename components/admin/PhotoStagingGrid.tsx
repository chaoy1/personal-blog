'use client'

import { UploadQueue } from '@/components/admin/UploadQueue'
import type { UploadQueueController } from '@/lib/upload-queue'

type AlbumOption = { id: string; title: string }
export type PhotoStagingMetadata = Record<string, { caption: string; albumId: string }>

type Props = {
  controller: UploadQueueController
  albums: AlbumOption[]
  metadata: PhotoStagingMetadata
  errors?: Record<string, string>
  onMetadata(id: string, value: { caption: string; albumId: string }): void
}

export function PhotoStagingGrid({
  controller,
  albums,
  metadata,
  errors = {},
  onMetadata,
}: Props) {
  return (
    <section className="photo-staging" aria-label="照片暂存区">
      <UploadQueue controller={controller} label="选择照片（选择后不会立即上传）" showStart={false} />
      {controller.items.length > 0 ? (
        <div className="photo-staging-grid">
          {controller.items.map((item) => {
            const values = metadata[item.id] ?? { caption: '', albumId: '' }
            return (
              <fieldset key={item.id} className="photo-staging-card">
                <legend>{item.file.name}</legend>
                <label>
                  <span>照片说明</span>
                  <input
                    type="text"
                    value={values.caption}
                    onChange={(event) => onMetadata(item.id, { ...values, caption: event.target.value })}
                  />
                </label>
                <label>
                  <span>存入相册</span>
                  <select
                    value={values.albumId}
                    onChange={(event) => onMetadata(item.id, { ...values, albumId: event.target.value })}
                  >
                    <option value="">不归入相册</option>
                    {albums.map((album) => (
                      <option key={album.id} value={album.id}>{album.title}</option>
                    ))}
                  </select>
                </label>
                {errors[item.id] ? <p className="error-text" role="alert">{errors[item.id]}</p> : null}
              </fieldset>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
