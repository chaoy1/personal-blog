import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { publicMetadata } from '@/lib/seo'
import { GuestbookProvider } from '@/lib/guestbook-context'
import { loadGuestbookSnapshot, readInitialSnapshot } from '@/lib/public-resource-loaders.server'

export const metadata: Metadata = publicMetadata({
  path: '/guestbook',
  title: '留言',
  description: '为来访者留下一页可以写下心意的留言簿。',
})

export default async function GuestbookLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { initialSnapshot, initialError } = await readInitialSnapshot(
    loadGuestbookSnapshot,
    '读取留言失败',
  )

  return (
    <GuestbookProvider initialSnapshot={initialSnapshot} initialError={initialError}>
      {children}
    </GuestbookProvider>
  )
}
