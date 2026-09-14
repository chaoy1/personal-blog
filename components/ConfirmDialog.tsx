'use client'

import { useCallback, useId, useRef, useState, type ReactNode } from 'react'
import Button from '@/components/Button'
import { useDialogBehavior } from '@/components/DialogBehavior'

export type ConfirmDialogOptions = {
  title: ReactNode
  description: ReactNode
  confirmLabel: string
  danger?: boolean
}

export type ConfirmDialogProps = ConfirmDialogOptions & {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const { dialogRef, onKeyDown } = useDialogBehavior<HTMLDivElement>({
    open,
    onClose: onCancel,
    initialFocusRef: cancelRef,
  })

  if (!open) return null

  return (
    <div
      ref={dialogRef}
      className="admin-dialog-backdrop"
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
      onKeyDown={onKeyDown}
      role="alertdialog"
      tabIndex={-1}
    >
      <div className="admin-dialog-card">
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        <div className="editor-save-actions">
          <Button ref={cancelRef} variant="ghost" onClick={onCancel}>取消</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

type PendingConfirm = ConfirmDialogOptions & {
  resolve: (confirmed: boolean) => void
}

export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve })
    })
  }, [])

  const close = useCallback((confirmed: boolean) => {
    if (!pending) return
    pending.resolve(confirmed)
    setPending(null)
  }, [pending])

  const dialog = pending ? (
    <ConfirmDialog
      open
      title={pending.title}
      description={pending.description}
      confirmLabel={pending.confirmLabel}
      danger={pending.danger}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  ) : null

  return { confirm, dialog }
}
