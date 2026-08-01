'use client'

import { useRouter } from 'next/navigation'

export default function AdminHeader() {
  const router = useRouter()

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.replace('/admin/login')
    router.refresh()
  }

  return (
    <button type="button" className="link-btn" onClick={logout}>
      退出登录
    </button>
  )
}
