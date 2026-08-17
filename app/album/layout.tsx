import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '光影',
  description: '收存沿途光影与未题之景的相册。',
}

export default function AlbumLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
