type PageIntroProps = {
  index: string
  eyebrow: string
  title: string
  seal: string
  description: string
  variant?: 'standard' | 'display' | 'compact'
}

export default function PageIntro({
  index,
  eyebrow,
  title,
  seal,
  description,
  variant = 'standard',
}: PageIntroProps) {
  return (
    <header className={`page-intro page-intro--${variant}`}>
      <div className="page-intro-copy">
        <div className="page-intro-meta">
          <span className="page-intro-index" aria-hidden="true">卷 {index}</span>
          <p className="eyebrow">{eyebrow}</p>
        </div>
        <h1>
          {title}
          <span className="article-seal" aria-hidden="true">
            {seal}
          </span>
        </h1>
        <p className="page-intro-description">{description}</p>
      </div>
      <span className="page-intro-mark" aria-hidden="true">
        <i />
        COLLECTED NOTES
      </span>
    </header>
  )
}
