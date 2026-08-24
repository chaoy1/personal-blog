import { notFound } from 'next/navigation'
import { ArticlePreview } from '@/components/admin/ArticlePreview'
import { getPostById } from '@/lib/posts'

type Props = {
  params: Promise<{ id: string }>
}

export default async function AdminArticlePreviewPage({ params }: Props) {
  const { id } = await params
  const post = await getPostById(id)
  if (!post) notFound()
  return <ArticlePreview post={post} />
}
