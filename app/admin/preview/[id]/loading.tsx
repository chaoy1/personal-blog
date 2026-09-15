export default function AdminArticlePreviewLoading() {
  return (
    <section className="admin-preview-page admin-preview-loading" role="region" aria-label="文章预览" data-preview-state="loading">
      <nav className="admin-preview-bar" aria-label="预览工具栏">
        <div className="admin-preview-identity">
          <span className="draft-tag">后台预览</span>
          <span className="admin-preview-label">正在读取已保存版本</span>
        </div>
        <span className="admin-preview-loading-mark" aria-hidden="true" />
      </nav>
      <div className="admin-preview-skeleton" aria-hidden="true">
        <div className="admin-preview-skeleton-kicker" />
        <div className="admin-preview-skeleton-title" />
        <div className="admin-preview-skeleton-line" />
        <div className="admin-preview-skeleton-body" />
      </div>
      <p className="sr-only" role="status">正在加载文章预览…</p>
    </section>
  )
}
