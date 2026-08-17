import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '登录',
  description: '登录似水流年，参与留言与互动。',
  robots: { index: false, follow: false },
}

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
