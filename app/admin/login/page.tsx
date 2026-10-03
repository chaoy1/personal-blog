'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { safeAdminNext } from '@/lib/admin-return'
import ThemeToggle from '@/components/ThemeToggle'
import './login-paper.css'

function adminErrorMessage(status?: number): string {
  if (status === 401) return '管理密码不正确'
  if (status === 500) return '后台暂时不可用，请联系站点管理员'
  return '后台登录失败，请稍后再试'
}

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

  return <div className="desk-scene ap-login-scene">
    <header className="ap-login-top"><Link href="/" aria-label="返回博客首页">← 返回首页</Link><ThemeToggle /></header>
    <main className="ap-login-window"><div className="ap-login-window-landscape" aria-hidden="true"><span>山窗常开<br />文字常新</span><small>WORDS, KEPT WITH TIME</small></div>
      <section className="ap-login-paper" role="region" aria-labelledby="admin-login-title" data-page-state="ready" data-auth-state="anonymous">
        <p className="ap-eyebrow">WRITING STUDIO / 小屋内务 <span className="ap-sr">写作后台</span></p>
        <div className="ap-login-title"><i className="desk-seal" aria-hidden="true">写</i><h1 id="admin-login-title" aria-label="后台登录">推窗，回到案头。</h1></div>
        <p className="ap-login-intro">旧稿有归处，新意有来时。<br />从这里，接着写你的日子。</p>
        <form id="login-form" onSubmit={handleSubmit} aria-label="后台登录表单" aria-busy={loading} aria-describedby={error ? 'admin-login-feedback' : 'admin-login-help'} data-form-state={formState}>
          <label className="ap-control" htmlFor="admin-password"><span>管理密码</span></label>
          <div className="ap-login-password-wrap"><input id="admin-password" aria-label="管理密码" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoFocus autoComplete="current-password" aria-invalid={Boolean(error)} placeholder="输入管理密码" required /><button className="ap-quiet" type="button" aria-label={showPassword ? '隐藏密码' : '显示密码'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? '隐' : '显'}</button></div>
          {error ? <p id="admin-login-feedback" className="ap-login-status ap-login-error" role="alert" tabIndex={-1} ref={feedbackRef}>{error}</p> : <p id="admin-login-help" className="ap-login-status" role="status">{loading ? '正在推开山窗…' : '使用管理密码进入私人写作室。'}</p>}
          <button className="ap-primary ap-login-enter" type="submit" disabled={loading || !password}>{loading ? '登录中…' : '进入后台'} <b aria-hidden="true">↗</b></button>
          {error && <button type="button" className="ap-quiet" onClick={() => void handleSubmit()} disabled={loading || !password}>重试登录</button>}
        </form>
        <footer className="ap-login-paper-foot"><span>似水流年 / 私人写作室</span><span>小屋内务 · 入</span></footer>
      </section>
    </main><footer className="ap-login-bottom"><span>山窗常开，文字常新。</span><b>山水有相逢，文字有归处。</b></footer>
  </div>
}
