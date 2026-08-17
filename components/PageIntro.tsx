type PageIntroProps = {
  index: string
  eyebrow: string
  title: string
  seal: string
  description: string
}

export default function PageIntro({ index, eyebrow, title, seal, description }: PageIntroProps) {
  return (
    <header className="page-intro">
      <span className="page-intro-index" aria-hidden="true">
        <b>{index}</b>
        <i>卷首</i>
      </span>
      <div className="page-intro-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1>
          {title}
          <span className="article-seal" aria-hidden="true">
            {seal}
          </span>
        </h1>
        <p className="page-intro-description">{description}</p>
      </div>
      <span className="page-intro-mark" aria-hidden="true">COLLECTED NOTES</span>
    </header>
  )
}
