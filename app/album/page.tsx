'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/blog'
import { useAppStore, type AlbumItem, type PhotoItem } from '@/lib/app-store'

type View = { mode: 'list' } | { mode: 'album'; album: AlbumItem } | { mode: 'all' }

export default function AlbumPage() {
  const { albums, photos, error, ready } = useAppStore()
  const [view, setView] = useState<View>({ mode: 'list' })

  const photosOf = (albumId: string) => photos.filter((p) => p.album_id === albumId)
  const orphanPhotos = photos.filter((p) => !p.album_id)
  const coverOf = (album: AlbumItem) => album.cover_url || photosOf(album.id)[0]?.url || ''

  const photoGrid = (list: PhotoItem[]) => (
    <div className="album-grid">
      {list.map((photo) => (
        <figure key={photo.id} className="album-item">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={photo.caption || '照片'} loading="lazy" />
          {photo.caption ? <figcaption>{photo.caption}</figcaption> : null}
          <span className="album-date">{formatDate(photo.created_at)}</span>
        </figure>
      ))}
    </div>
  )

  const currentAlbum = view.mode === 'album' ? view.album : null
  const currentPhotos = currentAlbum
    ? photosOf(currentAlbum.id)
    : view.mode === 'all'
      ? orphanPhotos
      : []

  return (
    <div className="wrap">
      <nav className="article-nav">
        <Link href="/">← 返回首页</Link>
        <span>相册</span>
      </nav>

      <article className="article" style={{ maxWidth: 940 }}>
        <p className="eyebrow">ALBUM</p>
        <h1>
          相册
          <span className="article-seal" aria-hidden="true">
            影
          </span>
        </h1>
        <div className="divider-ornament" aria-hidden="true">
          ※ ※ ※
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        {!ready && !error ? <p className="moments-empty">正在加载相册…</p> : null}

        {view.mode === 'list' ? (
          <>
            <div className="albums-grid">
              {albums.map((album) => {
                const cover = coverOf(album)
                const count = photosOf(album.id).length
                return (
                  <button
                    key={album.id}
                    type="button"
                    className="album-card"
                    onClick={() => setView({ mode: 'album', album })}
                  >
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="album-cover" src={cover} alt={album.title} loading="lazy" />
                    ) : (
                      <span className="album-cover placeholder">影</span>
                    )}
                    <span className="album-card-title">{album.title}</span>
                    {album.description ? (
                      <span className="album-card-desc">{album.description}</span>
                    ) : null}
                    <span className="album-card-meta">
                      {count} 张 · {formatDate(album.created_at)}
                    </span>
                  </button>
                )
              })}
              {orphanPhotos.length > 0 ? (
                <button type="button" className="album-card" onClick={() => setView({ mode: 'all' })}>
                  {orphanPhotos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="album-cover" src={orphanPhotos[0].url} alt="全部照片" loading="lazy" />
                  ) : (
                    <span className="album-cover placeholder">影</span>
                  )}
                  <span className="album-card-title">全部照片</span>
                  <span className="album-card-desc">未归入相册的照片</span>
                  <span className="album-card-meta">{orphanPhotos.length} 张</span>
                </button>
              ) : null}
            </div>
            {ready && albums.length === 0 && orphanPhotos.length === 0 && !error ? (
              <p className="moments-empty">相册还空着。</p>
            ) : null}
          </>
        ) : (
          <>
            <div className="album-head">
              <button type="button" className="link-btn" onClick={() => setView({ mode: 'list' })}>
                ← 全部相册
              </button>
              <div className="album-head-text">
                <h2>{currentAlbum ? currentAlbum.title : '全部照片'}</h2>
                {currentAlbum?.description ? (
                  <p className="album-head-desc">{currentAlbum.description}</p>
                ) : null}
                <span className="album-date">
                  {currentPhotos.length} 张
                  {currentAlbum ? ` · ${formatDate(currentAlbum.created_at)}` : ''}
                </span>
              </div>
            </div>

            {currentPhotos.length > 0 ? (
              photoGrid(currentPhotos)
            ) : (
              <p className="moments-empty">这本相册还没有照片。</p>
            )}
          </>
        )}
      </article>
    </div>
  )
}
