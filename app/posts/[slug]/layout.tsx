import type { ReactNode } from 'react'
import { CommentsProvider } from '@/lib/comments-context'
import { loadCommentsSnapshot, readInitialSnapshot } from '@/lib/public-resource-loaders.server'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export default async function PostLayout({ children, params }: Props) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  const { initialSnapshot, initialError } = await readInitialSnapshot(
    () => loadCommentsSnapshot(slug),
    '读取评论失败',
  )

  return (
    <CommentsProvider slug={slug} initialSnapshot={initialSnapshot} initialError={initialError}>
      {children}
    </CommentsProvider>
  )
}
