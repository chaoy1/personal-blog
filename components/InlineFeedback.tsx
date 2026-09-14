import type { ReactNode } from 'react'

export type FeedbackTone = 'success' | 'warning' | 'error' | 'info'

export type InlineFeedbackProps = {
  tone: FeedbackTone
  message: ReactNode
  onRetry?: () => void
  retryLabel?: string
}

export default function InlineFeedback({ tone, message, onRetry, retryLabel = '重试' }: InlineFeedbackProps) {
  const role = tone === 'error' ? 'alert' : 'status'
  return (
    <div className={`inline-feedback inline-feedback-${tone}`} data-feedback-tone={tone} role={role}>
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="button-hit-area inline-feedback-retry" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}
