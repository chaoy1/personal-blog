'use client'

import { useRouter } from 'next/navigation'

/** 返回上一页：有浏览历史时逐级后退，否则回到兜底页 */
export default function BackLink({
  fallback = '/',
  children = '返回上一页',
}: {
  fallback?: string
  children?: React.ReactNode
}) {
  const router = useRouter()

  return (
    <button
      type="button"
      className="article-nav-back"
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back()
        } else {
          router.push(fallback)
        }
      }}
    >
      <span className="nav-back-mark" aria-hidden="true" />
      {children}
    </button>
  )
}
