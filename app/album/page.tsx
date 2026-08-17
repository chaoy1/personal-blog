'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/blog'
import { useAppStore, type AlbumItem, type PhotoItem } from '@/lib/app-store'
import PageIntro from '@/components/PageIntro'

type View = { mode: 'list' } | { mode: 'album'; album: AlbumItem } | { mode: 'all' }

export default function AlbumPage() {
  const { albums, photos, error, ready } = useAppStore()
  const [view, setView] = useState<View>({ mode: 'list' })

  const photosOf = (albumId: string) => photos.filter((p) => p.album_id === albumId)
  const orphanPhotos = photos.filter((p) => !p.album_id)
  const coverOf = (album: AlbumItem) => album.cover_url || photosOf(album.id)[0]?.url || ''

  const photoGrid = (list: PhotoItem[]) => (
    <div className="album-grid">
      {list.map((photo, index) => (
        <figure key={photo.id} className="album-item">
          <span className="album-photo-index" aria-hidden="true">
            FRAME {String(index + 1).padStart(2, '0')}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={photo.caption || '照片'} loading="lazy" />
          <i className="album-photo-seal" aria-hidden="true">影</i>
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
        <Link href="/"><span className="nav-back-mark" aria-hidden="true" />返回首页</Link>
        <span>光影</span>
      </nav>

      <PageIntro
        index="03"
        eyebrow="GALLERY"
        title="光影"
        seal="影"
        description="收存沿途光影与未题之景。"
      />

      <article className="article content-sheet" style={{ maxWidth: 1080 }}>

        {error ? <p className="error-text">{error}</p> : null}
        {!ready && !error ? <p className="moments-empty">正在加载相册…</p> : null}

        {view.mode === 'list' ? (
          <>
            <div className="albums-grid">
              {albums.map((album, index) => {
                const cover = coverOf(album)
                const count = photosOf(album.id).length
                return (
                  <button
                    key={album.id}
                    type="button"
                    className="album-card"
                    onClick={() => setView({ mode: 'album', album })}
                  >
                    <span className="album-card-kicker">
                      ALBUM · {String(index + 1).padStart(2, '0')}
                    </span>
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
                    <span className="album-card-action" aria-hidden="true">开卷 ↗</span>
                  </button>
                )
              })}
              {orphanPhotos.length > 0 ? (
                <button type="button" className="album-card" onClick={() => setView({ mode: 'all' })}>
                  <span className="album-card-kicker">
                    ALBUM · {String(albums.length + 1).padStart(2, '0')}
                  </span>
                  {orphanPhotos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="album-cover" src={orphanPhotos[0].url} alt="全部照片" loading="lazy" />
                  ) : (
                    <span className="album-cover placeholder">影</span>
                  )}
                  <span className="album-card-title">全部照片</span>
                  <span className="album-card-desc">未归入相册的照片</span>
                  <span className="album-card-meta">{orphanPhotos.length} 张</span>
                  <span className="album-card-action" aria-hidden="true">开卷 ↗</span>
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
