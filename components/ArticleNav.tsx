import Link from 'next/link'
import BackLink from '@/components/BackLink'

type ArticleNavProps = {
  current: string
  ariaLabel?: string
  backHref?: string
  backLabel?: string
  backMode?: 'home' | 'history'
  backFallback?: string
}

export default function ArticleNav({
  current,
  ariaLabel = `${current}页导航`,
  backHref = '/',
  backLabel = '返回首页',
  backMode = 'home',
  backFallback = '/',
}: ArticleNavProps) {
  const label = <span className="article-nav-label">{backLabel}</span>

  return (
    <nav className="article-nav" aria-label={ariaLabel}>
      {backMode === 'history' ? (
        <BackLink fallback={backFallback}>{label}</BackLink>
      ) : (
        <Link href={backHref} className="article-nav-home">
          <span className="nav-back-mark" aria-hidden="true" />
          {label}
        </Link>
      )}
      <span className="article-nav-current">
        <span className="article-nav-label">{current}</span>
      </span>
    </nav>
  )
}
