'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import MarkdownView from '@/components/MarkdownView'
import { formatDate, type Post } from '@/lib/blog'

type OutlineEntry = { id: string; text: string; level: number }

export function ArticlePreview({ post }: { post: Post }) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [outline, setOutline] = useState<OutlineEntry[]>([])

  useEffect(() => {
    setOutline(Array.from(bodyRef.current?.querySelectorAll<HTMLHeadingElement>('h1, h2, h3, h4, h5, h6') ?? [])
      .filter((heading) => Boolean(heading.id && heading.textContent))
      .map((heading) => ({ id: heading.id, text: heading.textContent ?? '', level: Number(heading.tagName.slice(1)) })))
  }, [post.content])

  return (
    <section className="ap-article-page" role="region" aria-label="文章预览" data-preview-state="ready">
      <a className="ap-article-skip" href="#admin-preview-content">跳到预览正文</a>
      <header className="ap-page-head"><div><p className="ap-eyebrow">01 / A QUIET READING</p><h1>读一遍，再落款。</h1><p>只读已保存的这一页，看看文字本来的样子。</p></div>
        <Link className="ap-button" href={`/admin/editor?id=${post.id}`}>返回编辑</Link>
      </header>
      <nav className="ap-article-preview-nav" aria-label="预览工具栏">
        <div><span className="ap-chip">{post.published ? '已发布预览' : '草稿预览'}</span><span>后台预览 · 仅显示已保存版本</span></div>
        <Link className="ap-quiet" href="/admin/posts">返回文章管理</Link>
      </nav>
      <div className="ap-article-reading-layout">
        <article className="ap-sheet ap-article-reading" id="admin-preview-content" tabIndex={-1}>
          <header className="ap-article-reading-head">
            <div className="ap-article-folio"><span>山窗手记 / SAVED MANUSCRIPT</span><span aria-hidden="true">壹</span></div>
            <h2>{post.title}</h2>
            {post.excerpt ? <div className="ap-article-excerpt"><MarkdownView content={post.excerpt} /></div> : null}
            <div className="ap-article-byline"><span>{formatDate(post.created_at)}</span><span>{post.content.replace(/\s/g, '').length} 字</span><span className="ap-article-small-seal" aria-hidden="true">记</span></div>
          </header>
          <div ref={bodyRef} className="ap-article-prose"><MarkdownView content={post.content} /></div>
          <footer className="ap-article-end"><span aria-hidden="true" /><p>这一页，暂写到这里。</p><i className="ap-article-small-seal" aria-hidden="true">止</i></footer>
        </article>
        <aside className="ap-article-reading-margin" aria-label="文章预览页边信息">
          <section className="ap-article-page-note"><p className="ap-eyebrow">ON THIS PAGE / 本页</p>
            <nav aria-label="文章目录">{outline.length ? outline.map((entry, index) => <a key={entry.id} href={`#${encodeURIComponent(entry.id)}`} data-heading-level={entry.level}>
              <span>{String(index + 1).padStart(2, '0')}</span>{entry.text}
            </a>) : <a href="#admin-preview-content">从篇名读起</a>}</nav>
          </section>
          <section className="ap-sheet ap-article-manuscript-note"><span className="ap-article-note-index" aria-hidden="true">稿</span>
            <h3>{post.published ? <>已经成篇，<br />再读一遍。</> : <>尚未成篇，<br />也值得细读。</>}</h3>
            <p>{post.published ? '这篇文字处于已发布状态。预览呈现当前保存的版本。' : '这是一篇草稿。只在后台阅读，发布之后才会与读者相见。'}</p>
            <dl><div><dt>文章链接</dt><dd>/posts/{post.slug}</dd></div><div><dt>已保存版本</dt><dd>{formatDate(post.updated_at)}</dd></div></dl>
            <Link className="ap-quiet" href={`/admin/editor?id=${post.id}`}>继续写 ↗</Link>
            {post.published ? <Link className="ap-quiet" href={`/posts/${post.slug}`}>查看前台文章</Link> : null}
          </section>
          <p className="ap-article-margin-verse">让文字静下来，<br />让山风读一遍。</p>
        </aside>
      </div>
      <footer className="ap-article-footer">每一篇文字，都有自己的来处。<span>山窗案头 · 阅读预览</span></footer>
    </section>
  )
}
