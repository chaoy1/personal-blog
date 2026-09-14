import type { ReactNode } from 'react'
import { CommentsProvider } from '@/lib/comments-context'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export default async function PostLayout({ children, params }: Props) {
  const { slug: rawSlug } = await params
  return <CommentsProvider slug={decodeURIComponent(rawSlug)}>{children}</CommentsProvider>
}
