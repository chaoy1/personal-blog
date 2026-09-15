import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { publicMetadata } from '@/lib/seo'
import { AlbumsProvider } from '@/lib/albums-context'
import { loadAlbumsSnapshot } from '@/lib/public-resource-loaders.server'
import type { AlbumsSnapshot, ServerSnapshot } from '@/lib/public-resource-types'

export const metadata: Metadata = publicMetadata({
  path: '/album',
  title: '光影',
  description: '收存沿途光影与未题之景的相册。',
})

export default async function AlbumLayout({ children }: Readonly<{ children: ReactNode }>) {
  let initialSnapshot: ServerSnapshot<AlbumsSnapshot> | null = null
  let initialError = ''
  try {
    initialSnapshot = await loadAlbumsSnapshot()
  } catch (error) {
    initialError = error instanceof Error ? error.message : '读取光影失败'
  }

  return (
    <AlbumsProvider initialSnapshot={initialSnapshot} initialError={initialError}>
      {children}
    </AlbumsProvider>
  )
}
