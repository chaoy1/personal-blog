import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { publicMetadata } from '@/lib/seo'
import { MomentsProvider } from '@/lib/moments-context'
import { loadMomentsSnapshot, readInitialSnapshot } from '@/lib/public-resource-loaders.server'

export const metadata: Metadata = publicMetadata({
  path: '/moments',
  title: '闲语',
  description: '收录日常片言与短暂心绪的闲语。',
})

export default async function MomentsLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { initialSnapshot, initialError } = await readInitialSnapshot(
    loadMomentsSnapshot,
    '读取闲语失败',
  )

  return (
    <MomentsProvider initialSnapshot={initialSnapshot} initialError={initialError}>
      {children}
    </MomentsProvider>
  )
}
