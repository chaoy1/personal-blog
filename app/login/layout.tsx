import type { Metadata } from 'next'
import { publicMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  ...publicMetadata({
    path: '/login',
    title: '登录',
    description: '登录似水流年，参与留言与互动。',
  }),
  robots: { index: false, follow: false },
}

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
