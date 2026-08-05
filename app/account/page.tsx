'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser, storagePublicUrl } from '@/lib/supabase-browser'
import { useAppStore } from '@/lib/app-store'

export default function AccountPage() {
  const router = useRouter()
  const { ready, user, profile, updateProfile, signOut } = useAppStore()
  const [nickname, setNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwMessage, setPwMessage] = useState('')
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    if (ready && !user) {
      router.replace('/login')
      return
    }
    if (user) {
      setNickname(profile?.nickname ?? '')
      setAvatarUrl(profile?.avatar_url ?? '')
    }
  }, [ready, user, profile, router])

  async function uploadAvatar(file: File) {
    if (!user) return
    const ext = file.name.split('.').pop() || 'png'
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadErr } = await supabaseBrowser()
      .storage.from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '3600' })
    if (uploadErr) {
      setError(`头像上传失败：${uploadErr.message}`)
      return
    }
    setAvatarUrl(storagePublicUrl('avatars', path))
  }

  async function save() {
    if (!user) return
    setBusy(true)
    setError('')
    setMessage('')
    const err = await updateProfile({ nickname: nickname.trim(), avatar_url: avatarUrl })
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    setMessage('已保存。')
  }

  async function changePassword() {
    if (!user?.email) {
      setPwError('当前账号无法修改密码')
      return
    }
    if (newPassword.length < 6) {
      setPwError('新密码至少需要 6 位')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('两次输入的新密码不一致')
      return
    }
    setPwBusy(true)
    setPwError('')
    setPwMessage('')
    const sb = supabaseBrowser()
    const { error: verifyErr } = await sb.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    })
    if (verifyErr) {
      setPwBusy(false)
      setPwError('旧密码不正确')
      return
    }
    const { error: updateErr } = await sb.auth.updateUser({ password: newPassword })
    setPwBusy(false)
    if (updateErr) {
      setPwError(`修改失败：${updateErr.message}`)
      return
    }
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPwMessage('密码已修改。')
  }

  async function logout() {
    await signOut()
    router.replace('/')
    router.refresh()
  }

  return (
    <div className="account-wrap">
      <nav className="article-nav">
        <Link href="/">← 返回首页</Link>
        <span>个人资料</span>
      </nav>

      <div className="account-card">
        <header className="account-head">
          <h1>个人资料</h1>
          {user?.email ? <p className="account-email">账号 · {user.email}</p> : null}
        </header>

        <section className="account-section">
          <h2 className="account-section-title">
            <span className="sec-seal" aria-hidden="true">
              资
            </span>
            基本资料
          </h2>
          <div className="account-profile-row">
            <div className="account-avatar">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="头像" />
              ) : (
                <span className="placeholder">影</span>
              )}
              <label className="account-avatar-btn">
                更换头像
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) uploadAvatar(f)
                  }}
                />
              </label>
            </div>

            <div className="account-profile-fields">
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
              {error ? <p className="error-text">{error}</p> : null}
              {message ? <p className="notice-text">{message}</p> : null}
              <div className="editor-actions">
                <button className="btn btn-sm" type="button" onClick={save} disabled={busy}>
                  {busy ? '保存中…' : '保存资料'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="account-section">
          <h2 className="account-section-title">
            <span className="sec-seal" aria-hidden="true">
              密
            </span>
            修改密码
          </h2>
          <div className="account-pw-grid">
            <div className="field">
              <label htmlFor="old-password">旧密码</label>
              <input
                id="old-password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="输入当前密码"
              />
            </div>
            <div className="field">
              <label htmlFor="new-password">新密码（至少 6 位）</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="设置新密码"
              />
            </div>
            <div className="field">
              <label htmlFor="confirm-password">确认新密码</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="再输一遍新密码"
              />
            </div>
            {pwError ? <p className="error-text">{pwError}</p> : null}
            {pwMessage ? <p className="notice-text">{pwMessage}</p> : null}
            <div className="editor-actions">
              <button className="btn btn-sm" type="button" onClick={changePassword} disabled={pwBusy}>
                {pwBusy ? '修改中…' : '修改密码'}
              </button>
            </div>
          </div>
        </section>

        <footer className="account-foot">
          <button className="btn btn-ghost btn-sm" type="button" onClick={logout}>
            退出登录
          </button>
        </footer>
      </div>
    </div>
  )
}
