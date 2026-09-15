'use client'

import { useRef, useState } from 'react'
import { formatDate } from '@/lib/blog'
import { useAlbums } from '@/lib/albums-context'
import type { AlbumItem, PhotoItem } from '@/lib/store-types'
import PageIntro from '@/components/PageIntro'
import ArticleNav from '@/components/ArticleNav'
import '../album.css'

type View = { mode: 'list' } | { mode: 'album'; album: AlbumItem } | { mode: 'all' }

export default function AlbumPage() {
  const { albums, photos, error, hasData, isInitialLoading, isRefreshing, refreshAlbums } = useAlbums()
  const [view, setView] = useState<View>({ mode: 'list' })
  const [failedImages, setFailedImages] = useState<Record<string, true>>({})
  const listScrollTop = useRef<number | null>(null)

  const photosOf = (albumId: string) => photos.filter((p) => p.album_id === albumId)
  const orphanPhotos = photos.filter((p) => !p.album_id)
  const coverOf = (album: AlbumItem) => album.cover_url || photosOf(album.id)[0]?.url || ''
  const hasCollectionContent = albums.length > 0 || orphanPhotos.length > 0
  const pageState = !hasData && isInitialLoading
    ? 'loading'
    : !hasData && error
      ? 'error'
      : hasData && !hasCollectionContent && !error
        ? 'empty'
        : 'ready'

  const markImageFailed = (key: string) => {
    setFailedImages((current) => current[key] ? current : { ...current, [key]: true })
  }

  const openView = (next: View) => {
    listScrollTop.current = typeof window === 'undefined' ? 0 : window.scrollY
    setView(next)
  }

  const backToList = () => {
    const scrollTop = listScrollTop.current
    listScrollTop.current = null
    setView({ mode: 'list' })
    if (scrollTop === null || typeof window === 'undefined') return
    window.requestAnimationFrame(() => {
      try {
        window.scrollTo({ top: scrollTop, behavior: 'auto' })
      } catch {
        window.scrollTo(0, scrollTop)
      }
    })
  }

  const photoGrid = (list: PhotoItem[]) => (
    <div className="album-grid" aria-label="照片网格">
      {list.map((photo, index) => (
        <figure key={photo.id} className="album-item" data-photo-id={photo.id}>
          <span className="album-photo-index" aria-hidden="true">
            FRAME {String(index + 1).padStart(2, '0')}
          </span>
          <div className="album-photo-frame">
            {failedImages[`photo:${photo.id}`] ? (
              <span className="album-photo-placeholder" data-photo-placeholder={photo.id} role="img" aria-label="照片暂缺">
                影
              </span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.url}
                alt={photo.caption || `照片 ${index + 1}`}
                loading="lazy"
                data-lightbox-caption={photo.caption}
                data-lightbox-date={formatDate(photo.created_at)}
                onError={() => markImageFailed(`photo:${photo.id}`)}
              />
            )}
          </div>
          <i className="album-photo-seal" aria-hidden="true">影</i>
          {photo.caption ? <figcaption>{photo.caption}</figcaption> : null}
          <span className="album-date">{formatDate(photo.created_at)}</span>
        </figure>
      ))}
    </div>
  )

  const currentAlbum = view.mode === 'album'
    ? albums.find((album) => album.id === view.album.id) ?? view.album
    : null
  const currentPhotos = currentAlbum
    ? photosOf(currentAlbum.id)
    : view.mode === 'all'
      ? orphanPhotos
      : []

  return (
    <div className="wrap">
      <ArticleNav current="光影" />

      <main className="album-page">
        <PageIntro
          index="03"
          eyebrow="GALLERY"
          title="光影"
          seal="影"
          description="收存沿途光影与未题之景。"
        />

        <section
          className="article content-sheet album-sheet"
          aria-label={view.mode === 'list' ? '相册索引' : '相册详情'}
          data-page-state={pageState}
          data-view={view.mode}
        >

        {!hasData && isInitialLoading ? <p className="moments-empty">正在加载相册…</p> : null}
        {!hasData && error ? (
          <p className="error-text" role="alert">
            {error}{' '}
            <button type="button" className="link-btn" onClick={refreshAlbums}>重试</button>
          </p>
        ) : null}
        {hasData && (error || isRefreshing) ? (
          <p className="error-text" role="status">
            {error || '正在同步相册…'}
            {error ? <button type="button" className="link-btn" onClick={refreshAlbums}>重试同步</button> : null}
          </p>
        ) : null}

        {view.mode === 'list' ? (
          <>
            <div className="albums-grid" aria-label="相册册架">
              {albums.map((album, index) => {
                const cover = coverOf(album)
                const count = photosOf(album.id).length
                const coverKey = `cover:${album.id}`
                return (
                  <button
                    key={album.id}
                    type="button"
                    className="album-card"
                    aria-label={`打开相册：${album.title}`}
                    data-album-id={album.id}
                    onClick={() => openView({ mode: 'album', album })}
                  >
                    <span className="album-card-kicker">
                      ALBUM · {String(index + 1).padStart(2, '0')}
                    </span>
                    {cover && !failedImages[coverKey] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="album-cover"
                        src={cover}
                        alt={album.title}
                        loading="lazy"
                        onError={() => markImageFailed(coverKey)}
                      />
                    ) : (
                      <span className="album-cover placeholder" role="img" aria-label={`${album.title}封面暂缺`}>影</span>
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
                <button
                  type="button"
                  className="album-card"
                  aria-label="打开相册：全部照片"
                  data-album-id="orphan"
                  onClick={() => openView({ mode: 'all' })}
                >
                  <span className="album-card-kicker">
                    ALBUM · {String(albums.length + 1).padStart(2, '0')}
                  </span>
                  {orphanPhotos[0] && !failedImages['cover:orphan'] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="album-cover"
                      src={orphanPhotos[0].url}
                      alt="全部照片"
                      loading="lazy"
                      onError={() => markImageFailed('cover:orphan')}
                    />
                  ) : (
                    <span className="album-cover placeholder" role="img" aria-label="全部照片封面暂缺">影</span>
                  )}
                  <span className="album-card-title">全部照片</span>
                  <span className="album-card-desc">未归入相册的照片</span>
                  <span className="album-card-meta">{orphanPhotos.length} 张</span>
                  <span className="album-card-action" aria-hidden="true">开卷 ↗</span>
                </button>
              ) : null}
            </div>
            {hasData && albums.length === 0 && orphanPhotos.length === 0 && !error ? (
              <p className="empty-state album-empty">相册还空着。</p>
            ) : null}
          </>
        ) : (
          <>
            <div className="album-head">
              <button type="button" className="link-btn album-back" aria-label="返回相册列表" onClick={backToList}>
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
            ) : hasData ? (
              <p className="empty-state album-empty">这本相册还没有照片。</p>
            ) : null}
          </>
        )}
        </section>
      </main>
    </div>
  )
}
