'use client'

import { useEffect, useRef, type PointerEvent } from 'react'

type AlbumCardProps = {
  id: string
  index: number
  title: string
  description: string
  date: string
  count: number
  covers: string[]
  failedImages: Record<string, true>
  onImageError: (key: string) => void
  onOpen: () => void
  cardRef: (node: HTMLButtonElement | null) => void
}

/** Each album owns its paper highlight; cover frames retain their own resting angles. */
export default function AlbumCard({ id, index, title, description, date, count, covers, failedImages, onImageError, onOpen, cardRef }: AlbumCardProps) {
  const frame = useRef<number | null>(null)
  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
  }, [])

  const resetSpot = (button: HTMLButtonElement) => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    button.style.removeProperty('--spot-x')
    button.style.removeProperty('--spot-y')
  }

  const moveSpot = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'touch' || !window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return
    const button = event.currentTarget
    const rect = button.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      button.style.setProperty('--spot-x', `${x}px`)
      button.style.setProperty('--spot-y', `${y}px`)
      frame.current = null
    })
  }

  const layout = covers.length < 2 ? 'single' : covers.length === 2 ? 'pair' : ['open', 'diagonal', 'inset'][index % 3]

  return (
    <button type="button" className={`album-card layout-${layout}`} data-album-id={id}
      aria-label={`打开相册：${title}`} ref={cardRef} onClick={onOpen}
      onPointerMove={moveSpot} onPointerLeave={event => resetSpot(event.currentTarget)}
      onPointerCancel={event => resetSpot(event.currentTarget)} onBlur={event => resetSpot(event.currentTarget)}>
      <span className="album-kicker"><span>ALBUM / {String(index + 1).padStart(2, '0')}</span><span>{count} 张</span></span>
      <span className="album-stage" aria-hidden="true">
        {covers.length ? covers.map((url, photoIndex) => {
          const key = `cover:${id}:${url}`
          return (
            <span className="shot" key={url} data-frame={`FRAME ${String(photoIndex + 1).padStart(2, '0')}`}>
              {failedImages[key] ? <span className="album-cover-placeholder" data-cover-placeholder={key}>影</span> : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" loading="lazy" onError={() => onImageError(key)} />
              )}
            </span>
          )
        }) : <span className="shot" data-frame="NO FRAME"><span className="album-cover-placeholder">影</span></span>}
      </span>
      <span className="album-card-title"><span>{title}</span><i aria-hidden="true">影</i></span>
      <span className="album-card-desc" title={description}>{description || '暂未题记。'}</span>
      <span className="album-foot"><span>{date ? `${date} · ` : ''}{String(count).padStart(2, '0')} 张</span>
        <span className="album-action" aria-hidden="true">开卷 <b>↗</b></span>
      </span>
    </button>
  )
}
