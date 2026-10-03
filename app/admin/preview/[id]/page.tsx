import Link from 'next/link'
import { ArticlePreview } from '@/components/admin/ArticlePreview'
import { getPostById } from '@/lib/posts'
import '../../articles-paper.css'

type Props = {
  params: Promise<{ id: string }>
}

function PreviewBoundary({ id, kind }: { id: string; kind: 'not-found' | 'error' }) {
  const isNotFound = kind === 'not-found'
  return (
    <section
      className="ap-article-page ap-article-boundary"
      role="region"
      aria-label="文章预览"
      data-preview-state={isNotFound ? 'not-found' : 'error'}
    >
      <nav className="ap-article-preview-nav" aria-label="预览工具栏">
        <div className="ap-article-preview-identity">
          <span className="ap-chip">后台预览</span>
          <span className="ap-article-hint">未载入文章内容</span>
        </div>
        <Link className="ap-button" href="/admin/posts">返回文章管理</Link>
      </nav>
      <div className="ap-sheet ap-article-boundary-state" role="alert">
        <span className="ap-eyebrow">PREVIEW UNAVAILABLE</span>
        <h1>{isNotFound ? '找不到这篇文章' : '文章预览暂时无法加载'}</h1>
        <p>{isNotFound ? '文章不存在，或当前管理员没有查看它的权限。' : '后台读取文章时遇到问题，正文没有被当作公开 404 展示。'}</p>
        <div className="ap-article-boundary-actions">
          {!isNotFound ? <Link className="ap-button" href={`/admin/preview/${id}`}>重新加载</Link> : null}
          <Link className="ap-button ap-primary" href="/admin/posts">返回文章管理</Link>
        </div>
      </div>
    </section>
  )
}

export default async function AdminArticlePreviewPage({ params }: Props) {
  const { id } = await params
  let post
  try {
    post = await getPostById(id)
  } catch {
    return <PreviewBoundary id={id} kind="error" />
  }
  if (!post) return <PreviewBoundary id={id} kind="not-found" />
  return <ArticlePreview post={post} />
}
