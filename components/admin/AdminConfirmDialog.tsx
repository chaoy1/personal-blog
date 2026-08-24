'use client'

import { type ReactNode, useEffect, useId, useRef, useState } from 'react'

export type AdminConfirmOptions = {
  title: string
  description: string
  confirmLabel: string
}

type PendingConfirmation = AdminConfirmOptions & {
  resolve: (confirmed: boolean) => void
  trigger: HTMLElement | null
}

export function useAdminConfirm(): {
  confirm: (options: AdminConfirmOptions) => Promise<boolean>
  dialog: ReactNode
} {
  const [pending, setPending] = useState<PendingConfirmation | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  const close = (confirmed: boolean) => {
    if (!pending) return

    const { resolve, trigger } = pending
    setPending(null)
    trigger?.focus()
    resolve(confirmed)
  }

  const confirm = (options: AdminConfirmOptions) => new Promise<boolean>((resolve) => {
    setPending({
      ...options,
      resolve,
      trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null,
    })
  })

  useEffect(() => {
    if (!pending) return

    cancelRef.current?.focus()
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(false)
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [pending])

  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return

    const cancel = cancelRef.current
    const confirmButton = confirmRef.current
    if (!cancel || !confirmButton) return

    if (event.shiftKey && document.activeElement === cancel) {
      event.preventDefault()
      confirmButton.focus()
    } else if (!event.shiftKey && document.activeElement === confirmButton) {
      event.preventDefault()
      cancel.focus()
    }
  }

  const dialog = pending ? (
    <div
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      onKeyDown={trapFocus}
      role="alertdialog"
    >
      <h2 id={titleId}>{pending.title}</h2>
      <p id={descriptionId}>{pending.description}</p>
      <button ref={cancelRef} type="button" onClick={() => close(false)}>
        取消
      </button>
      <button ref={confirmRef} type="button" onClick={() => close(true)}>
        {pending.confirmLabel}
      </button>
    </div>
  ) : null

  return { confirm, dialog }
}
