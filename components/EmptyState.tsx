import type { ReactNode } from 'react'

export type EmptyStateProps = {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state" data-state="empty">
      <div className="big" aria-hidden="true">空</div>
      <p className="empty-state-title">{title}</p>
      {description ? <p className="empty-state-description">{description}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  )
}
