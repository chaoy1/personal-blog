'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useDialogBehavior } from '@/components/DialogBehavior'

const ZOOMABLE =
  '.md-body img, .album-item img, .moment-images img, .moments-images img, .tl-thumb'

type LightboxItem = {
  src: string
  alt: string
  caption: string
  date: string
}

function collectionFor(img: HTMLImageElement): HTMLImageElement[] {
  const albumGrid = img.closest<HTMLElement>('.album-grid')
  if (albumGrid) return Array.from(albumGrid.querySelectorAll<HTMLImageElement>('.album-item img'))

  const collection = img.closest<HTMLElement>('.md-body, .moment-images, .moments-images, .timeline')
  return collection
    ? Array.from(collection.querySelectorAll<HTMLImageElement>(ZOOMABLE))
    : [img]
}

function itemFrom(img: HTMLImageElement): LightboxItem {
  return {
    src: img.currentSrc || img.src,
    alt: img.alt || '图片预览',
    caption: img.dataset.lightboxCaption || img.alt || '',
    date: img.dataset.lightboxDate || '',
  }
}

export default function Lightbox() {
  const [items, setItems] = useState<LightboxItem[]>([])
  const [index, setIndex] = useState(0)
  const closeRef = useRef<HTMLButtonElement>(null)

  const openImage = useCallback((img: HTMLImageElement) => {
    img.focus()
    const images = collectionFor(img)
    setItems(images.map(itemFrom))
    setIndex(Math.max(0, images.indexOf(img)))
  }, [])

  const close = useCallback(() => {
    setItems([])
    setIndex(0)
  }, [])

  const move = useCallback((delta: number) => {
    setIndex((current) => Math.min(Math.max(current + delta, 0), items.length - 1))
  }, [items.length])

  const { dialogRef, onKeyDown } = useDialogBehavior<HTMLDivElement>({
    open: items.length > 0,
    onClose: close,
    initialFocusRef: closeRef,
  })

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const img = target.closest<HTMLImageElement>(ZOOMABLE)
      if (!img) return
      e.preventDefault()
      openImage(img)
    }
    const onKey = (e: KeyboardEvent) => {
      const target = e.target
      const img = target instanceof Element ? target.closest<HTMLImageElement>(ZOOMABLE) : null
      if (!document.querySelector('.lightbox') && img && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        openImage(img)
        return
      }
    }
    const prepareImages = (root: ParentNode) => {
      root.querySelectorAll<HTMLImageElement>(ZOOMABLE).forEach((img) => {
        if (!img.hasAttribute('tabindex')) {
          img.tabIndex = 0
          img.dataset.lightboxTab = 'true'
        }
        img.setAttribute('aria-haspopup', 'dialog')
      })
    }
    prepareImages(document)
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) prepareImages(node)
        })
      })
    })
    observer.observe(document.body, { childList: true, subtree: true })

    document.addEventListener('click', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => {
      observer.disconnect()
      document.removeEventListener('click', onDocClick)
      window.removeEventListener('keydown', onKey)
      document.querySelectorAll<HTMLElement>('[data-lightbox-tab="true"]').forEach((img) => {
        img.removeAttribute('tabindex')
        img.removeAttribute('data-lightbox-tab')
        img.removeAttribute('aria-haspopup')
      })
    }
  }, [openImage])

  const current = items[index]
  if (!current) return null

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    onKeyDown(event)
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      move(-1)
    }
    if (event.key === 'ArrowRight' && index < items.length - 1) {
      event.preventDefault()
      move(1)
    }
  }

  return (
    <div
      ref={dialogRef}
      className="lightbox"
      onKeyDown={handleDialogKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={current.alt || '图片预览'}
    >
      <button ref={closeRef} type="button" className="lightbox-close" onClick={close} aria-label="关闭">
        ×
      </button>
      {items.length > 1 ? (
        <>
          <button
            type="button"
            className="lightbox-nav prev"
            aria-label="上一张"
            onClick={() => move(-1)}
            disabled={index === 0}
          >
            ←
          </button>
          <button
            type="button"
            className="lightbox-nav next"
            aria-label="下一张"
            onClick={() => move(1)}
            disabled={index === items.length - 1}
          >
            →
          </button>
        </>
      ) : null}
      <figure className="lightbox-frame" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lightbox-img" src={current.src} alt={current.alt} />
        <figcaption>
          <span>{current.caption}</span>
          <span className="lightbox-count">
            {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
          </span>
          {current.date ? <time className="lightbox-date">{current.date}</time> : null}
        </figcaption>
      </figure>
    </div>
  )
}
