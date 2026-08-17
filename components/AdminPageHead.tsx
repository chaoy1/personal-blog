import type { ReactNode } from 'react'

type AdminPageHeadProps = {
  index: string
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}

export default function AdminPageHead({
  index,
  eyebrow,
  title,
  description,
  action,
}: AdminPageHeadProps) {
  return (
    <header className="admin-page-head">
      <span className="admin-page-index" aria-hidden="true">{index}</span>
      <div className="admin-page-copy">
        <span className="admin-page-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className="admin-page-action">{action}</div> : null}
    </header>
  )
}
