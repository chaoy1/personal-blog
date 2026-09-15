'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import { SITE_NAME } from '@/lib/site'

type FormState = 'idle' | 'submitting' | 'success' | 'error'
type AuthMode = 'login' | 'register'

function safeAuthNext(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'

  try {
    const url = new URL(value, 'https://blog.example')
    if (url.origin !== 'https://blog.example') return '/'
    if (url.pathname === '/login' || url.pathname === '/admin/login') return '/'
    return `${url.pathname}${url.search}${url.hash}` || '/'
  } catch {
    return '/'
  }
}

function requestedAuthNext(): string {
  if (typeof window === 'undefined') return '/'
  return safeAuthNext(new URLSearchParams(window.location.search).get('next'))
}

function authErrorZh(msg: string, fallback: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials') || m.includes('邮箱或密码错误')) return '邮箱或密码错误'
  if (m.includes('email not confirmed')) return '邮箱尚未确认，请先查收确认邮件后再登录'
  if (m.includes('already registered') || m.includes('已注册')) return '该邮箱已注册，请直接登录'
  if (m.includes('invalid email') || m.includes('邮箱格式不正确')) return '邮箱格式不正确'
  if (m.includes('password should be at least') || m.includes('密码至少需要')) return '密码至少需要 6 位'
  if (m.includes('rate limit') || m.includes('too many requests')) return '操作太频繁，请稍后再试'
  return fallback
}

export default function LoginPage() {
  const router = useRouter()
  const { ready, user } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [formState, setFormState] = useState<FormState>('idle')
  const [returnPath, setReturnPath] = useState(requestedAuthNext)
  const authRequestId = useRef(0)
  const feedbackRef = useRef<HTMLParagraphElement>(null)
  const busy = formState === 'submitting'

  useEffect(() => {
    setReturnPath(requestedAuthNext())
  }, [])

  useEffect(() => {
    if (error) feedbackRef.current?.focus()
  }, [error])

  function navigateAfterAuth() {
    router.replace(requestedAuthNext())
    router.refresh()
  }

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (busy) return
    const requestId = ++authRequestId.current
    const requestMode = mode
    const normalizedEmail = email.trim()
    setError('')
    setNotice('')
    setFormState('submitting')
    try {
      const sb = supabaseBrowser()
      if (requestMode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email: normalizedEmail, password })
        if (requestId !== authRequestId.current) return
        if (error) {
          setError(authErrorZh(error.message, '登录失败，请稍后再试'))
          setFormState('error')
          return
        }
        navigateAfterAuth()
      } else {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password, nickname: nickname.trim() }),
        })
        if (requestId !== authRequestId.current) return
        const j = await res.json().catch(() => ({})) as { error?: unknown }
        if (requestId !== authRequestId.current) return
        if (!res.ok) {
          const message = typeof j.error === 'string' ? j.error : ''
          setError(authErrorZh(message, '注册失败，请稍后再试'))
          setFormState('error')
          return
        }
        // 注册即自动登录，无需邮箱确认。
        const { error: signInErr } = await sb.auth.signInWithPassword({ email: normalizedEmail, password })
        if (requestId !== authRequestId.current) return
        if (signInErr) {
          setNotice('注册成功，请直接登录。')
          setMode('login')
          setPassword('')
          setFormState('success')
          return
        }
        navigateAfterAuth()
      }
    } catch {
      if (requestId !== authRequestId.current) return
      setError(requestMode === 'login' ? '登录失败，请稍后再试' : '注册失败，请稍后再试')
      setFormState('error')
    } finally {
      if (requestId === authRequestId.current) {
        setFormState((state) => (state === 'submitting' ? 'idle' : state))
      }
    }
  }

  function switchMode(nextMode: AuthMode) {
    authRequestId.current += 1
    setMode(nextMode)
    setPassword('')
    setNickname('')
    setError('')
    setNotice('')
    setFormState('idle')
  }

  if (ready && user) {
    const destination = returnPath === '/' ? '/account' : returnPath
    return (
      <main className="auth-login-page" aria-labelledby="login-title" data-page-state="ready" data-auth-state="authenticated">
        <section className="login-card auth-login-card">
          <Link href="/" className="auth-brand">{SITE_NAME}</Link>
          <p className="auth-signed-in" role="status">你已经登录</p>
          <h1 id="login-title">欢迎回来</h1>
          <p className="sub">无需再次填写登录信息，可以继续浏览。</p>
          <Link href={destination} className="btn auth-primary-link">
            {destination === '/account' ? '进入账户' : '继续访问'}
          </Link>
          <Link href="/" className="back-link">← 返回博客</Link>
        </section>
      </main>
    )
  }

  const isLogin = mode === 'login'
  const title = isLogin ? '登录' : '注册'

  return (
    <main className="auth-login-page" aria-labelledby="login-title" data-page-state="ready" data-auth-state="anonymous">
      <section className="login-card auth-login-card">
        <Link href="/" className="auth-brand">{SITE_NAME}</Link>
        <h1 id="login-title">{title}</h1>
        <p className="sub">在 {SITE_NAME} 留下你的名字</p>

        <div className="auth-tabs" role="tablist" aria-label="认证模式">
          <button
            id="login-tab"
            type="button"
            role="tab"
            aria-selected={isLogin}
            aria-controls="auth-panel"
            className={`tab ${isLogin ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            登录
          </button>
          <button
            id="register-tab"
            type="button"
            role="tab"
            aria-selected={!isLogin}
            aria-controls="auth-panel"
            className={`tab ${!isLogin ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            注册
          </button>
        </div>

        <div id="auth-panel" role="tabpanel" aria-labelledby={`${mode}-tab`}>
          <form
            onSubmit={submit}
            aria-label="登录表单"
            aria-busy={busy}
            aria-describedby={error ? 'auth-feedback' : undefined}
            data-form-state={formState}
          >
            {mode === 'register' ? (
              <div className="field">
                <label htmlFor="nickname">昵称</label>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="怎么称呼你？"
                  autoComplete="nickname"
                />
              </div>
            ) : null}
            <div className="field">
              <label htmlFor="email">邮箱</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={Boolean(error)}
              />
            </div>
            <div className="field">
              <label htmlFor="password">密码</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isLogin ? '输入密码' : '至少 6 位'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                aria-invalid={Boolean(error)}
              />
            </div>
            {error ? <p id="auth-feedback" ref={feedbackRef} className="error-text" role="alert" tabIndex={-1}>{error}</p> : null}
            {notice ? <p className="notice-text" role="status">{notice}</p> : null}
            <button className="btn" type="submit" disabled={busy || !email || !password}>
              {busy ? '处理中…' : isLogin ? '登录' : '注册并登录'}
            </button>
            {formState === 'error' ? (
              <button className="btn btn-ghost auth-retry" type="button" disabled={busy || !email || !password} onClick={() => { void submit() }}>
                {isLogin ? '重试登录' : '重试注册'}
              </button>
            ) : null}
          </form>
        </div>

        <Link href="/" className="back-link">← 返回博客</Link>
      </section>
    </main>
  )
}
