'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminFeedback } from '@/components/admin/AdminFeedback'
import { runAdminAction } from '@/lib/admin-action'

export default function AdminHeader() {
  const router = useRouter()
  const { notify } = useAdminFeedback()
  const [busy, setBusy] = useState(false)

  async function logout() {
    if (busy) return
    setBusy(true)
    try {
      await runAdminAction(fetch('/api/admin/logout', { method: 'POST' }))
      router.replace('/admin/login')
      router.refresh()
    } catch (cause) {
      notify({ kind: 'error', message: cause instanceof Error ? cause.message : '退出登录失败' })
      setBusy(false)
    }
  }

  return (
    <button type="button" className="link-btn" onClick={() => void logout()} disabled={busy}>
      {busy ? '正在退出…' : '退出登录'}
    </button>
  )
}
