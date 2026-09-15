import Link from 'next/link'
import { ArticlePreview } from '@/components/admin/ArticlePreview'
import { getPostById } from '@/lib/posts'

type Props = {
  params: Promise<{ id: string }>
}

function PreviewBoundary({ id, kind }: { id: string; kind: 'not-found' | 'error' }) {
  const isNotFound = kind === 'not-found'
  return (
    <section
      className="admin-preview-page admin-preview-boundary"
      role="region"
      aria-label="文章预览"
      data-preview-state={isNotFound ? 'not-found' : 'error'}
    >
      <nav className="admin-preview-bar" aria-label="预览工具栏">
        <div className="admin-preview-identity">
          <span className="draft-tag">后台预览</span>
          <span className="admin-preview-label">未载入文章内容</span>
        </div>
        <Link className="btn btn-ghost btn-sm" href="/admin">返回文章管理</Link>
      </nav>
      <div className="admin-preview-state" role="alert">
        <span className="admin-preview-kicker">PREVIEW UNAVAILABLE</span>
        <h1>{isNotFound ? '找不到这篇文章' : '文章预览暂时无法加载'}</h1>
        <p>{isNotFound ? '文章不存在，或当前管理员没有查看它的权限。' : '后台读取文章时遇到问题，正文没有被当作公开 404 展示。'}</p>
        <div className="admin-preview-actions">
          {!isNotFound ? <Link className="btn btn-ghost btn-sm" href={`/admin/preview/${id}`}>重新加载</Link> : null}
          <Link className="btn btn-sm" href="/admin">返回文章管理</Link>
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
