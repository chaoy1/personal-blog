import Link from 'next/link'
import MarkdownView from '@/components/MarkdownView'
import type { Post } from '@/lib/blog'

export function ArticlePreview({ post }: { post: Post }) {
  return (
    <section className="admin-preview-page" role="region" aria-label="文章预览" data-preview-state="ready">
      <a className="skip-link" href="#admin-preview-content">跳到预览正文</a>
      <nav className="admin-preview-bar" aria-label="预览工具栏">
        <div className="admin-preview-identity">
          <span className="draft-tag">{post.published ? '已发布预览' : '草稿预览'}</span>
          <span className="admin-preview-label">后台预览 · 仅显示已保存版本</span>
        </div>
        <div className="admin-preview-actions">
          <Link className="btn btn-ghost btn-sm" href="/admin">返回文章管理</Link>
          <Link className="btn btn-sm" href={`/admin/editor?id=${post.id}`}>
            返回编辑
          </Link>
          {post.published ? (
            <Link className="btn btn-ghost btn-sm" href={`/posts/${post.slug}`}>查看前台文章</Link>
          ) : null}
        </div>
      </nav>
      <article className="admin-article-preview" id="admin-preview-content">
        <header className="article-preview-head">
          <span className="admin-preview-kicker">PUBLIC-FIDELITY READING VIEW</span>
          <h1>{post.title}</h1>
          {post.excerpt ? <p>{post.excerpt}</p> : null}
        </header>
        <div className="preview-pane">
          <MarkdownView content={post.content} />
        </div>
      </article>
    </section>
  )
}
