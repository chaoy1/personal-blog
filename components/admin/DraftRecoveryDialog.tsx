'use client'

import { useEffect, useRef } from 'react'
import type { ArticleDraftSnapshot } from '@/lib/article-draft'

type DraftRecoveryDialogProps = {
  open: boolean
  local: ArticleDraftSnapshot | null
  onRestore(): void
  onDiscard(): void
}

export function DraftRecoveryDialog({
  open,
  local,
  onRestore,
  onDiscard,
}: DraftRecoveryDialogProps) {
  const restoreRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) restoreRef.current?.focus()
  }, [open])

  if (!open || !local) return null

  return (
    <div
      className="admin-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-recovery-title"
      aria-describedby="draft-recovery-description"
    >
      <div className="admin-dialog-card">
        <span className="draft-tag">发现备份</span>
        <h2 id="draft-recovery-title">本地版本更新</h2>
        <p id="draft-recovery-description">
          这台设备上保留了更新的内容。请选择恢复本地版本，或继续使用服务器版本。
        </p>
        <p className="hint">本地备份：{new Date(local.updatedAt).toLocaleString('zh-CN')}</p>
        <div className="editor-save-actions">
          <button type="button" className="btn btn-ghost" onClick={onDiscard}>
            使用服务器版本
          </button>
          <button ref={restoreRef} type="button" className="btn" onClick={onRestore}>
            恢复本地版本
          </button>
        </div>
      </div>
    </div>
  )
}
