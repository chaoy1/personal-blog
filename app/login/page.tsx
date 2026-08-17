'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { SITE_NAME } from '@/lib/site'

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [formState, setFormState] = useState<FormState>('idle')
  const busy = formState === 'submitting'

  function authErrorZh(msg: string): string {
    const m = msg.toLowerCase()
    if (m.includes('invalid login credentials')) return '邮箱或密码错误'
    if (m.includes('email not confirmed')) return '邮箱尚未确认，请先查收确认邮件后再登录'
    if (m.includes('already registered')) return '该邮箱已注册，请直接登录'
    if (m.includes('invalid email')) return '邮箱格式不正确'
    if (m.includes('password should be at least')) return '密码至少需要 6 位'
    if (m.includes('rate limit')) return '操作太频繁，请稍后再试'
    return msg
  }

  async function submit() {
    setError('')
    setNotice('')
    setFormState('submitting')
    try {
      const sb = supabaseBrowser()
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password })
        if (error) {
          setError(authErrorZh(error.message))
          setFormState('error')
          return
        }
        router.push('/')
        router.refresh()
      } else {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, nickname }),
        })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(j.error || '注册失败，请稍后再试')
          setFormState('error')
          return
        }
        // 注册即自动登录，无需邮箱确认
        const { error: signInErr } = await sb.auth.signInWithPassword({ email, password })
        if (signInErr) {
          setNotice('注册成功，请直接登录。')
          setMode('login')
          setFormState('success')
          return
        }
        router.push('/')
        router.refresh()
      }
    } catch {
      setError(mode === 'login' ? '登录失败，请稍后再试' : '注册失败，请稍后再试')
      setFormState('error')
    } finally {
      setFormState((state) => (state === 'submitting' ? 'idle' : state))
    }
  }

  return (
    <div className="login-card">
      <h1>{mode === 'login' ? '登录' : '注册'}</h1>
      <p className="sub">在 {SITE_NAME} 留下你的名字</p>

      <div className="auth-tabs">
        <button
          type="button"
          className={`tab ${mode === 'login' ? 'active' : ''}`}
          onClick={() => {
            setMode('login')
            setError('')
            setNotice('')
            setFormState('idle')
          }}
        >
          登录
        </button>
        <button
          type="button"
          className={`tab ${mode === 'register' ? 'active' : ''}`}
          onClick={() => {
            setMode('register')
            setError('')
            setNotice('')
            setFormState('idle')
          }}
        >
          注册
        </button>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); submit() }} style={{ marginTop: 26 }} aria-busy={busy} data-form-state={formState}>
        {mode === 'register' ? (
          <div className="field">
            <label htmlFor="nickname">昵称</label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="怎么称呼你？"
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
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
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
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'register' ? '至少 6 位' : '输入密码'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>
        {error ? <p className="error-text" role="alert">{error}</p> : null}
        {notice ? <p className="notice-text" role="status">{notice}</p> : null}
        <button className="btn" type="submit" disabled={busy || !email || !password}>
          {busy ? '处理中…' : mode === 'login' ? '登录' : '注册并登录'}
        </button>
        {formState === 'error' ? (
          <button className="btn btn-ghost" type="button" disabled={busy || !email || !password} onClick={submit}>
            {mode === 'login' ? '重试登录' : '重试注册'}
          </button>
        ) : null}
      </form>

      <Link href="/" className="back-link">
        ← 返回首页
      </Link>
    </div>
  )
}
