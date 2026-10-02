'use client'
import { type RefObject, useEffect } from 'react'

// One delegated listener and one pending frame; touch and reduced motion stay flat.
export function useDeskPaperMotion(root: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const scene = root.current
    if (!scene || !window.matchMedia) return
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let active: HTMLElement | null = null
    let frame = 0
    const clear = () => {
      cancelAnimationFrame(frame); frame = 0
      if (active) ['--rx', '--ry', '--curl', '--shade-x'].forEach(name => active?.style.removeProperty(name))
      active = null
    }
    const move = (event: PointerEvent) => {
      if (!fine.matches || reduced.matches || event.pointerType === 'touch') { clear(); return }
      const paper = (event.target as HTMLElement).closest<HTMLElement>('.desk-post,.desk-draft-note')
      if (!paper || !scene.contains(paper)) { clear(); return }
      if (active !== paper) { clear(); active = paper }
      const bounds = paper.getBoundingClientRect()
      const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
      const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        paper.style.setProperty('--rx', `${(0.5 - y) * 2.4}deg`)
        paper.style.setProperty('--ry', `${(x - 0.5) * 3}deg`)
        paper.style.setProperty('--shade-x', `${2 + x * 5}px`)
        paper.style.setProperty('--curl', String(x * y)); frame = 0
      })
    }
    scene.addEventListener('pointermove', move); scene.addEventListener('pointerleave', clear)
    fine.addEventListener('change', clear); reduced.addEventListener('change', clear)
    return () => { clear(); scene.removeEventListener('pointermove', move); scene.removeEventListener('pointerleave', clear); fine.removeEventListener('change', clear); reduced.removeEventListener('change', clear) }
  }, [root])
}
