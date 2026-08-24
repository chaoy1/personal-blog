import Link from 'next/link'
import MarkdownView from '@/components/MarkdownView'
import type { Post } from '@/lib/blog'

export function ArticlePreview({ post }: { post: Post }) {
  return (
    <article className="admin-article-preview">
      <header className="article-preview-head">
        <span className="draft-tag">{post.published ? '已发布预览' : '草稿预览'}</span>
        <h1>{post.title}</h1>
        {post.excerpt ? <p>{post.excerpt}</p> : null}
        <div className="editor-save-actions">
          <Link className="btn btn-ghost" href={`/admin/editor?id=${post.id}`}>
            返回编辑
          </Link>
          {post.published ? (
            <Link className="btn" href={`/posts/${post.slug}`}>查看前台文章</Link>
          ) : null}
        </div>
      </header>
      <div className="preview-pane">
        <MarkdownView content={post.content} />
      </div>
    </article>
  )
}
