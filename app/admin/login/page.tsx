'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? '登录失败，请重试')
        return
      }
      router.replace('/admin')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-card">
      <h1>后台登录</h1>
      <p className="sub">输入管理密码进入控制台</p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="password">管理密码</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
          />
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        <button className="btn" type="submit" disabled={loading || !password}>
          {loading ? '登录中…' : '进入后台'}
        </button>
      </form>
      <Link href="/" className="back-link">
        ← 返回博客首页
      </Link>
    </div>
  )
}
