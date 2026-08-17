import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '留言',
  description: '为来访者留下一页可以写下心意的留言簿。',
}

export default function GuestbookLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
