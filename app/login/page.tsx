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
          setError(error.message)
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
          setError(error.message)
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
          setNotice('註冊成功！請到郵箱查收確認郵件後再登錄。')
        }
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-card">
      <h1>{mode === 'login' ? '登錄' : '註冊'}</h1>
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
          登錄
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
          註冊
        </button>
      </div>

      <form onSubmit={submit} style={{ marginTop: 26 }}>
        {mode === 'register' ? (
          <div className="field">
            <label htmlFor="nickname">暱稱</label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="怎麼稱呼你？"
            />
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="email">郵箱</label>
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
          <label htmlFor="password">密碼</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'register' ? '至少 6 位' : '輸入密碼'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        {notice ? <p className="notice-text">{notice}</p> : null}
        <button className="btn" type="submit" disabled={busy || !email || !password}>
          {busy ? '處理中…' : mode === 'login' ? '登錄' : '註冊並登錄'}
        </button>
      </form>

      <Link href="/" className="back-link">
        ← 返回首頁
      </Link>
    </div>
  )
}
