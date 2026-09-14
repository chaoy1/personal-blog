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
  const kind = getShellKind(usePathname() ?? '/')
  const isPublic = kind === 'public'

  return (
    <>
      {isPublic ? <BackgroundStage /> : null}
      {isPublic ? <div className="vignette" aria-hidden="true" /> : null}
      {isPublic ? <div className="grain" aria-hidden="true" /> : null}
      {isPublic ? <ScrollTop /> : null}
      {kind !== 'admin' ? <SiteNav /> : null}
      {children}
      {isPublic ? <Lightbox /> : null}
    </>
  )
}
