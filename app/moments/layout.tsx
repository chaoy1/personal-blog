import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { publicMetadata } from '@/lib/seo'
import { MomentsProvider } from '@/lib/moments-context'

export const metadata: Metadata = publicMetadata({
  path: '/moments',
  title: '闲语',
  description: '收录日常片言与短暂心绪的闲语。',
})

export default function MomentsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <MomentsProvider>{children}</MomentsProvider>
}
