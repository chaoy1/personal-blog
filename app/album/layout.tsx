import type { Metadata } from 'next'
import { publicMetadata } from '@/lib/seo'

export const metadata: Metadata = publicMetadata({
  path: '/album',
  title: '光影',
  description: '收存沿途光影与未题之景的相册。',
})

export default function AlbumLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
