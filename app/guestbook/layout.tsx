import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { publicMetadata } from '@/lib/seo'
import { GuestbookProvider } from '@/lib/guestbook-context'
import { loadGuestbookSnapshot } from '@/lib/public-resource-loaders.server'
import type { GuestbookSnapshot, ServerSnapshot } from '@/lib/public-resource-types'

export const metadata: Metadata = publicMetadata({
  path: '/guestbook',
  title: '留言',
  description: '为来访者留下一页可以写下心意的留言簿。',
})

export default async function GuestbookLayout({ children }: Readonly<{ children: ReactNode }>) {
  let initialSnapshot: ServerSnapshot<GuestbookSnapshot> | null = null
  let initialError = ''
  try {
    initialSnapshot = await loadGuestbookSnapshot()
  } catch (error) {
    initialError = error instanceof Error ? error.message : '读取留言失败'
  }

  return (
    <GuestbookProvider initialSnapshot={initialSnapshot} initialError={initialError}>
      {children}
    </GuestbookProvider>
  )
}
