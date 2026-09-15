import type { ReactNode } from 'react'
import { CommentsProvider } from '@/lib/comments-context'
import { loadCommentsSnapshot } from '@/lib/public-resource-loaders.server'
import type { CommentsSnapshot, ServerSnapshot } from '@/lib/public-resource-types'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export default async function PostLayout({ children, params }: Props) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  let initialSnapshot: ServerSnapshot<CommentsSnapshot> | null = null
  let initialError = ''
  try {
    initialSnapshot = await loadCommentsSnapshot(slug)
  } catch (error) {
    initialError = error instanceof Error ? error.message : '读取评论失败'
  }

  return (
    <CommentsProvider slug={slug} initialSnapshot={initialSnapshot} initialError={initialError}>
      {children}
    </CommentsProvider>
  )
}
