import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { publicMetadata } from '@/lib/seo'
import { GuestbookProvider } from '@/lib/guestbook-context'

export const metadata: Metadata = publicMetadata({
  path: '/guestbook',
  title: '留言',
  description: '为来访者留下一页可以写下心意的留言簿。',
})

export default function GuestbookLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <GuestbookProvider>{children}</GuestbookProvider>
}
