'use client'

import { useEffect, useRef, useState } from 'react'
import { formatDate } from '@/lib/blog'
import { useAlbums } from '@/lib/albums-context'
import type { AlbumItem, PhotoItem } from '@/lib/store-types'
import AlbumCard from '@/components/AlbumCard'
import ArticleNav from '@/components/ArticleNav'
import '../album.css'

type View = { mode: 'list' } | { mode: 'album'; album: AlbumItem } | { mode: 'all' }

export default function AlbumPage() {
  const { albums, photos, error, hasData, isInitialLoading, isRefreshing, refreshAlbums } = useAlbums()
  const [view, setView] = useState<View>({ mode: 'list' })
  const [failedImages, setFailedImages] = useState<Record<string, true>>({})
  const listScrollTop = useRef<number | null>(null)
  const openedCard = useRef<string | null>(null)
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const detailTitle = useRef<HTMLHeadingElement>(null)
  const pendingNavigation = useRef(false)

  const photosOf = (albumId: string) => photos.filter((p) => p.album_id === albumId)
  const orphanPhotos = photos.filter((p) => !p.album_id)
  const coversOf = (list: PhotoItem[], cover = '') => Array.from(new Set([cover, ...list.map(photo => photo.url)].filter(Boolean))).slice(0, 3)
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

  const openView = (next: View, cardId: string) => {
    listScrollTop.current = typeof window === 'undefined' ? 0 : window.scrollY
    openedCard.current = cardId
    pendingNavigation.current = true
    setView(next)
  }

  const backToList = () => {
    pendingNavigation.current = true
    setView({ mode: 'list' })
  }

  useEffect(() => {
    if (!pendingNavigation.current) return
    const frame = requestAnimationFrame(() => {
      pendingNavigation.current = false
      if (view.mode === 'list') {
        const card = openedCard.current ? cardRefs.current[openedCard.current] : null
        card?.focus({ preventScroll: true })
        window.scrollTo({ top: listScrollTop.current ?? 0, behavior: 'instant' })
        listScrollTop.current = null
      } else {
        const title = detailTitle.current
        title?.focus({ preventScroll: true })
        if (title) window.scrollTo({ top: Math.max(0, title.getBoundingClientRect().top + window.scrollY - 32), behavior: 'instant' })
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [view])

  const photoGrid = (list: PhotoItem[]) => (
    <div className="album-grid" aria-label="照片网格">
      {list.map((photo, index) => (
        <figure key={photo.id} className="album-item" data-photo-id={photo.id}>
          <span className="album-photo-index" aria-hidden="true">
            FRAME {String(index + 1).padStart(2, '0')}
          </span>
          <div className="album-photo-frame">
            {failedImages[`photo:${photo.id}:${photo.url}`] ? (
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
                onError={() => markImageFailed(`photo:${photo.id}:${photo.url}`)}
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

  const collectionCount = albums.length + (orphanPhotos.length ? 1 : 0)

  return (
    <div className="wrap">
      <ArticleNav current="光影" />
      <main className="album-page">
        <section className="album-sheet" aria-label={view.mode === 'list' ? '相册索引' : '相册详情'}
          data-page-state={pageState} data-view={view.mode}>
          <div className="top-rule" aria-hidden="true" />
          <header className="album-hero">
            <div className="hero-copy">
              <div className="hero-overline">卷 03 <small>THE COLLECTED FRAMES</small></div>
              <h1><span className="title">光影</span><span className="title-tail">沿途影集</span></h1>
              <p className="hero-intro">收存沿途光影，<b>与未题之景。</b></p>
              <div className="hero-index">COLLECTED WITH TIME <i aria-hidden="true" />
                <span>{hasData ? `${String(collectionCount).padStart(2, '0')} ALBUMS / ${String(photos.length).padStart(2, '0')} FRAMES` : '沿途拾光'}</span>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true" />
            <span className="hero-stamp" aria-hidden="true">影</span>
            <span className="hero-aside" aria-hidden="true">山河入镜 · 岁月留影</span>
          </header>
          <div className="album-sheet-content">
            {hasData && (error || isRefreshing) ? (
              <p className="sync-notice" role="status">
                {error || '正在同步相册…'}
                {error ? <button type="button" onClick={refreshAlbums}>重试同步</button> : null}
              </p>
            ) : null}
            {view.mode === 'list' ? (
              <>
                <div className="collection-heading">
                  <h2>沿途所见 <small>ALBUMS / 收存</small></h2>
                  {hasData ? <span aria-label={`共 ${collectionCount} 册，${photos.length} 帧`}>共 <b>{String(collectionCount).padStart(2, '0')}</b> 册 · <b>{String(photos.length).padStart(2, '0')}</b> 帧</span> : null}
                </div>
                <p className="collection-intro"><span>一册一段路，一帧一时光。</span><span>轻触封面 · 展开影集</span></p>
                {!hasData && isInitialLoading ? (
                  <div className="album-state" role="status"><span className="state-symbol" aria-hidden="true">影</span><p>正在加载相册…</p><span className="loading-line" aria-hidden="true" /></div>
                ) : null}
                {!hasData && error ? (
                  <div className="album-state" role="alert"><span className="state-symbol" aria-hidden="true">影</span><p>{error}</p><button type="button" onClick={refreshAlbums}>重试</button></div>
                ) : null}
                <div className="albums-grid" aria-label="相册册架">
                  {albums.map((album, index) => {
                    const list = photosOf(album.id)
                    return <AlbumCard key={album.id} id={album.id} index={index} title={album.title}
                      description={album.description} date={formatDate(album.created_at)} count={list.length}
                      covers={coversOf(list, album.cover_url)} failedImages={failedImages} onImageError={markImageFailed}
                      cardRef={node => { cardRefs.current[album.id] = node }} onOpen={() => openView({ mode: 'album', album }, album.id)} />
                  })}
                  {orphanPhotos.length ? <AlbumCard id="orphan" index={albums.length} title="全部照片" description="未归入相册的片刻。"
                    date="" count={orphanPhotos.length} covers={coversOf(orphanPhotos)} failedImages={failedImages} onImageError={markImageFailed}
                    cardRef={node => { cardRefs.current.orphan = node }} onOpen={() => openView({ mode: 'all' }, 'orphan')} /> : null}
                </div>
                {hasData && !hasCollectionContent && !error ? <div className="album-state"><span className="state-symbol" aria-hidden="true">影</span><p>相册还空着。</p></div> : null}
              </>
            ) : (
              <>
                <div className="album-head">
                  <button type="button" className="album-back" aria-label="返回相册列表" onClick={backToList}>← 全部相册</button>
                  <div className="album-head-text">
                    <small>COLLECTED FRAMES / 册中光影</small>
                    <h2 ref={detailTitle} tabIndex={-1}>{currentAlbum ? currentAlbum.title : '全部照片'}</h2>
                    {currentAlbum?.description ? <p className="album-head-desc">{currentAlbum.description}</p> : null}
                    <span className="album-date">{currentPhotos.length} 张{currentAlbum ? ` · ${formatDate(currentAlbum.created_at)}` : ''}</span>
                  </div>
                </div>
                {currentPhotos.length ? <><p className="view-hint">轻触照片，细看这一帧光影。</p>{photoGrid(currentPhotos)}</> : hasData ? <div className="album-state"><span className="state-symbol" aria-hidden="true">影</span><p>这本相册还没有照片。</p></div> : null}
              </>
            )}
            <div className="colophon"><span>光有来处，影有归处。</span><span>COLLECTED WITH TIME · 卷三</span></div>
          </div>
        </section>
      </main>
    </div>
  )
}
