import type { Metadata } from 'next'
import { publicMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  ...publicMetadata({
    path: '/account',
    title: '个人资料',
    description: '管理似水流年账户的个人资料与安全设置。',
  }),
  robots: { index: false, follow: false },
}

export default function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
