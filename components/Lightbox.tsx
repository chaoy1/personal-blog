'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDialogBehavior } from '@/components/DialogBehavior'

const ZOOMABLE =
  '.md-body img, .album-item img, .moment-images img, .moments-images img, .tl-thumb'

export default function Lightbox() {
  const [src, setSrc] = useState<string | null>(null)
  const [alt, setAlt] = useState('')
  const closeRef = useRef<HTMLButtonElement>(null)

  const openImage = useCallback((img: HTMLImageElement) => {
    img.focus()
    setSrc(img.currentSrc || img.src)
    setAlt(img.alt || '')
  }, [])

  const close = useCallback(() => {
    setSrc(null)
    setAlt('')
  }, [])

  const { dialogRef, onKeyDown } = useDialogBehavior<HTMLDivElement>({
    open: Boolean(src),
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
      if (!src && img && (e.key === 'Enter' || e.key === ' ')) {
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

  if (!src) return null

  return (
    <div
      ref={dialogRef}
      className="lightbox"
      onKeyDown={onKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={alt || '图片预览'}
    >
      <button ref={closeRef} type="button" className="lightbox-close" onClick={close} aria-label="关闭">
        ×
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="lightbox-img"
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
