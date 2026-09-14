'use client'

import { type ReactNode, useState } from 'react'
import ConfirmDialog from '@/components/ConfirmDialog'

export type AdminConfirmOptions = {
  title: string
  description: string
  confirmLabel: string
}

type PendingConfirmation = AdminConfirmOptions & {
  resolve: (confirmed: boolean) => void
}

export function useAdminConfirm(): {
  confirm: (options: AdminConfirmOptions) => Promise<boolean>
  dialog: ReactNode
} {
  const [pending, setPending] = useState<PendingConfirmation | null>(null)

  const close = (confirmed: boolean) => {
    if (!pending) return

    const { resolve } = pending
    setPending(null)
    resolve(confirmed)
  }

  const confirm = (options: AdminConfirmOptions) => new Promise<boolean>((resolve) => {
    setPending({
      ...options,
      resolve,
    })
  })

  const dialog = pending ? (
    <ConfirmDialog
      open
      title={pending.title}
      description={pending.description}
      confirmLabel={pending.confirmLabel}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  ) : null

  return { confirm, dialog }
}
