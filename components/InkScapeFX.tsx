'use client'

import { useEffect } from 'react'

/**
 * 为 InkScape 的 data-depth 图层提供视差：
 * 鼠标移动时各层按深度产生不同程度的位移（近大远小），
 * 滚动时 likewise 产生轻微纵向错位。rAF + 线性插值，运动柔和。
 */
export default function InkScapeFX() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const layers = Array.from(
      document.querySelectorAll<SVGGElement>('.ink-bg [data-depth]')
    )
    if (layers.length === 0) return

    let targetX = 0
    let targetY = 0
    let curX = 0
    let curY = 0
    let raf = 0
    let running = false

    const frame = () => {
      // 线性插值趋近目标，形成阻尼感
      curX += (targetX - curX) * 0.06
      curY += (targetY - curY) * 0.06

      const scrollShift = Math.min(window.scrollY, 1200) * 0.012

      for (const layer of layers) {
        const depth = Number(layer.dataset.depth || 0)
        const tx = curX * depth
        const ty = curY * depth * 0.55 + scrollShift * depth * 0.35
        layer.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`
      }

      if (Math.abs(targetX - curX) > 0.01 || Math.abs(targetY - curY) > 0.01) {
        raf = requestAnimationFrame(frame)
      } else {
        // 静止后仍需跟随滚动微调，保持低频循环由 scroll 事件触发
        running = false
      }
    }

    const start = () => {
      if (!running) {
        running = true
        raf = requestAnimationFrame(frame)
      }
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      // 归一化到 [-1, 1]
      targetX = (e.clientX / window.innerWidth - 0.5) * 2
      targetY = (e.clientY / window.innerHeight - 0.5) * 2
      start()
    }

    const onScroll = () => start()

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return null
}
