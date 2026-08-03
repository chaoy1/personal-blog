'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { SITE_NAME } from '@/lib/site'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

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

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    const sb = supabaseBrowser()
    try {
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password })
        if (error) {
          setError(authErrorZh(error.message))
          return
        }
        router.push('/')
        router.refresh()
      } else {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { nickname } },
        })
        if (error) {
          setError(authErrorZh(error.message))
          return
        }
        const uid = data.user?.id
        if (data.session && uid) {
          try {
            await sb
              .from('profiles')
              .upsert(
                { id: uid, nickname: nickname || email.split('@')[0] || '旅人' },
                { onConflict: 'id' }
              )
          } catch {
            // ignore
          }
          router.push('/')
          router.refresh()
        } else {
          setNotice('注册成功！请到邮箱查收确认邮件后再登录。')
        }
      }
    } finally {
      setBusy(false)
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
          }}
        >
          注册
        </button>
      </div>

      <form onSubmit={submit} style={{ marginTop: 26 }}>
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
        {error ? <p className="error-text">{error}</p> : null}
        {notice ? <p className="notice-text">{notice}</p> : null}
        <button className="btn" type="submit" disabled={busy || !email || !password}>
          {busy ? '处理中…' : mode === 'login' ? '登录' : '注册并登录'}
        </button>
      </form>

      <Link href="/" className="back-link">
        ← 返回首页
      </Link>
    </div>
  )
}
