import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '闲语',
  description: '收录日常片言与短暂心绪的闲语。',
}

export default function MomentsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
