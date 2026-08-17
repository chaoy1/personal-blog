'use client'

import { useEffect, useState } from 'react'
import { shouldRunAmbientMotion } from '@/lib/motion-policy'

type ConnectionWithSaveData = Navigator & {
  connection?: EventTarget & { saveData?: boolean }
}

function readAmbientMotion(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const saveData = Boolean((navigator as ConnectionWithSaveData).connection?.saveData)
  return shouldRunAmbientMotion({
    visible: document.visibilityState === 'visible',
    reduced,
    saveData,
  })
}

export function supportsFinePointer(): boolean {
  return window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false
}

export default function useAmbientMotion(): boolean {
  // Start inert so the server and the first client render agree; the effect
  // immediately activates only when the browser policy allows it.
  const [active, setActive] = useState(false)

  useEffect(() => {
    const reducedQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const connection = (navigator as ConnectionWithSaveData).connection
    const sync = () => setActive(readAmbientMotion())

    document.addEventListener('visibilitychange', sync)
    reducedQuery?.addEventListener?.('change', sync)
    connection?.addEventListener?.('change', sync)
    sync()

    return () => {
      document.removeEventListener('visibilitychange', sync)
      reducedQuery?.removeEventListener?.('change', sync)
      connection?.removeEventListener?.('change', sync)
    }
  }, [])

  return active
}
