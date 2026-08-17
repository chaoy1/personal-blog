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
  return window.matchMedia?.('(any-hover: hover) and (any-pointer: fine)').matches ?? false
}

export default function useAmbientMotion(): boolean | null {
  // Keep the server and first client render neutral until browser-only policy
  // signals resolve; null is distinct from a confirmed inactive state.
  const [active, setActive] = useState<boolean | null>(null)

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
