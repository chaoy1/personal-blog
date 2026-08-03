'use client'

import { useCallback, useEffect, useState } from 'react'

const ZOOMABLE =
  '.md-body img, .album-item img, .moment-images img, .moments-images img, .tl-thumb'

export default function Lightbox() {
  const [src, setSrc] = useState<string | null>(null)
  const [alt, setAlt] = useState('')

  const close = useCallback(() => setSrc(null), [])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const img = target.closest<HTMLImageElement>(ZOOMABLE)
      if (!img) return
      e.preventDefault()
      setSrc(img.currentSrc || img.src)
      setAlt(img.alt || '')
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('click', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [close])

  useEffect(() => {
    if (!src) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [src])

  if (!src) return null

  return (
    <div
      className="lightbox"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label={alt || '图片预览'}
    >
      <button type="button" className="lightbox-close" onClick={close} aria-label="关闭">
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
