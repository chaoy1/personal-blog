'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { safeAdminNext } from '@/lib/admin-return'

function adminErrorMessage(status?: number): string {
  if (status === 401) return '管理密码不正确'
  if (status === 500) return '后台暂时不可用，请联系站点管理员'
  return '后台登录失败，请稍后再试'
}

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'error' | 'success'>('idle')
  const feedbackRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (error) feedbackRef.current?.focus()
  }, [error])

  async function handleSubmit(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault()
    if (loading) return

    setError('')
    setLoading(true)
    setFormState('submitting')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        setError(adminErrorMessage(res.status))
        setFormState('error')
        return
      }
      setFormState('success')
      const next = safeAdminNext(new URLSearchParams(window.location.search).get('next'))
      router.replace(next)
      router.refresh()
    } catch {
      setError('后台登录失败，请稍后再试')
      setFormState('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      className="admin-login-page"
      role="region"
      aria-labelledby="admin-login-title"
      data-page-state="ready"
      data-auth-state="anonymous"
    >
      <div className="login-card admin-login-card">
        <div className="admin-login-brand" aria-hidden="true">
          <span>写作后台</span>
          <span className="admin-login-code">WRITING STUDIO</span>
        </div>
        <h1 id="admin-login-title">后台登录</h1>
        <p className="sub">输入管理密码进入内容后台</p>
        <form
          onSubmit={handleSubmit}
          aria-label="后台登录表单"
          aria-busy={loading}
          aria-describedby={error ? 'admin-login-feedback' : undefined}
          data-form-state={formState}
        >
          <div className="field">
            <label htmlFor="admin-password">管理密码</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
              autoComplete="current-password"
              aria-invalid={Boolean(error)}
            />
          </div>
          {error ? (
            <p
              id="admin-login-feedback"
              className="error-text"
              role="alert"
              tabIndex={-1}
              ref={feedbackRef}
            >
              {error}
            </p>
          ) : null}
          <button className="btn" type="submit" disabled={loading || !password}>
            {loading ? '登录中…' : '进入后台'}
          </button>
          {error ? (
            <button
              className="admin-login-retry"
              type="button"
              onClick={() => void handleSubmit()}
              disabled={loading || !password}
            >
              重试登录
            </button>
          ) : null}
        </form>
        <Link href="/" className="back-link" aria-label="返回博客首页">
          ← 返回博客首页
        </Link>
      </div>
    </section>
  )
}
