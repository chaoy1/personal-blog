'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import BackgroundStage from '@/components/BackgroundStage'
import Lightbox from '@/components/Lightbox'
import SiteNav from '@/components/SiteNav'
import ScrollTop from '@/components/ScrollTop'

export type ShellKind = 'public' | 'auth' | 'admin'

export function getShellKind(pathname: string): ShellKind {
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname === '/login' || pathname.startsWith('/account')) return 'auth'
  return 'public'
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/'
  const kind = getShellKind(pathname)
  const isPublic = kind === 'public'
  const isPublicAuthRoute = pathname === '/login' || pathname === '/account'
  const showPublicAmbient = isPublic || isPublicAuthRoute
  const showSiteNav = kind !== 'admin'

  return (
    <>
      {showPublicAmbient ? <BackgroundStage /> : null}
      {showPublicAmbient ? <div className="vignette" aria-hidden="true" /> : null}
      {showPublicAmbient ? <div className="grain" aria-hidden="true" /> : null}
      {isPublic ? <ScrollTop /> : null}
      {showSiteNav ? <SiteNav /> : null}
      {children}
      {isPublic ? <Lightbox /> : null}
    </>
  )
}
