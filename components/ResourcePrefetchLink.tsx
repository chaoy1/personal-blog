'use client'

import Link from 'next/link'
import { useCallback, useRef, type ComponentProps, type FocusEvent, type PointerEvent } from 'react'
import { loadAlbums, loadComments, loadGuestbook, loadMoments } from '@/lib/public-resource-loaders.browser'
import { publicResourceCache, type PublicResourceKey } from '@/lib/public-resource-cache'

type LinkProps = ComponentProps<typeof Link>

export type ResourcePrefetchLinkProps = Omit<LinkProps, 'onPointerEnter' | 'onFocus' | 'onPointerDown'> & {
  resourceKey?: PublicResourceKey
  resourceLoader?: () => Promise<unknown>
  intentPrefetch?: boolean
  onPointerEnter?: (event: PointerEvent<HTMLAnchorElement>) => void
  onFocus?: (event: FocusEvent<HTMLAnchorElement>) => void
  onPointerDown?: (event: PointerEvent<HTMLAnchorElement>) => void
}

type NetworkInformationLike = {
  saveData?: boolean
  effectiveType?: string
}

export function isConstrainedNetwork(): boolean {
  if (typeof navigator === 'undefined') return false
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection
  return Boolean(connection?.saveData || connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g')
}

function loaderFor(key: PublicResourceKey): (() => Promise<unknown>) | null {
  if (key === 'moments') return loadMoments
  if (key === 'albums') return loadAlbums
  if (key === 'guestbook') return loadGuestbook
  if (key.startsWith('comments:')) return () => loadComments(key.slice('comments:'.length))
  return null
}

export default function ResourcePrefetchLink({
  resourceKey,
  resourceLoader,
  intentPrefetch = false,
  prefetch,
  onPointerEnter,
  onFocus,
  onPointerDown,
  ...props
}: ResourcePrefetchLinkProps) {
  const intentStarted = useRef(false)
  const constrained = isConstrainedNetwork()
  const loader = resourceKey ? resourceLoader ?? loaderFor(resourceKey) : null
  const routePrefetch = constrained && resourceKey && !intentPrefetch && prefetch === true ? false : prefetch

  const preloadOnIntent = useCallback(() => {
    if (!intentPrefetch || !resourceKey || !loader || intentStarted.current) return
    intentStarted.current = true
    void publicResourceCache.preload(resourceKey, loader).catch(() => undefined)
  }, [intentPrefetch, resourceKey, loader])

  return (
    <Link
      {...props}
      prefetch={routePrefetch}
      onPointerEnter={(event) => {
        onPointerEnter?.(event)
        preloadOnIntent()
      }}
      onFocus={(event) => {
        onFocus?.(event)
        preloadOnIntent()
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event)
        preloadOnIntent()
      }}
    />
  )
}
