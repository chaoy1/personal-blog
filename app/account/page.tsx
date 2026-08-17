'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser, storagePublicUrl } from '@/lib/supabase-browser'
import { useAppStore } from '@/lib/app-store'
import Avatar from '@/components/Avatar'

export default function AccountPage() {
  const router = useRouter()
  const { ready, user, profile, updateProfile } = useAppStore()
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
  const [showPasswords, setShowPasswords] = useState(false)

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
    setMessage('资料已保存')
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
    setPwMessage('密码已修改')
  }

  function finish() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return (
    <div className="account-wrap">
      <nav className="article-nav">
        <Link href="/"><span className="nav-back-mark" aria-hidden="true" />返回首页</Link>
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
              <Avatar src={avatarUrl} alt="头像" />
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

        <section className="account-section account-security">
          <div className="account-security-head">
            <div>
              <span className="account-section-index">02 · SECURITY</span>
              <h2>修改密码</h2>
            </div>
            <p>更新后，其他设备上的登录状态可能需要重新验证。</p>
          </div>

          <div className="account-security-layout">
            <aside className="security-note" aria-label="密码建议">
              <span>密码建议</span>
              <p>至少六位，并混合使用字母、数字或符号。不要与其他网站共用同一密码。</p>
              <i aria-hidden="true">安</i>
            </aside>

            <form
              className="account-pw-grid"
              onSubmit={(event) => {
                event.preventDefault()
                changePassword()
              }}
            >
              <div className="field">
                <label htmlFor="old-password">当前密码</label>
                <div className="password-input">
                  <input
                    id="old-password"
                    type={showPasswords ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="输入当前密码"
                  />
                  <button type="button" onClick={() => setShowPasswords((value) => !value)}>
                    {showPasswords ? '隐藏' : '显示'}
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="new-password">新密码</label>
                <div className="password-input">
                  <input
                    id="new-password"
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="至少 6 位"
                  />
                </div>
                <div className="password-meter" aria-label="密码长度提示">
                  <i className={newPassword.length >= 6 ? 'active' : ''} />
                  <i className={newPassword.length >= 8 ? 'active' : ''} />
                  <i className={newPassword.length >= 10 ? 'active' : ''} />
                  <span>{newPassword ? (newPassword.length >= 10 ? '较稳妥' : newPassword.length >= 6 ? '可用' : '还需补充') : '至少 6 位'}</span>
                </div>
              </div>
              <div className="field">
                <label htmlFor="confirm-password">再次输入新密码</label>
                <div className="password-input">
                  <input
                    id="confirm-password"
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="保持两次输入一致"
                  />
                </div>
              </div>
              {pwError ? <p className="error-text account-pw-status">{pwError}</p> : null}
              {pwMessage ? <p className="notice-text account-pw-status">{pwMessage}</p> : null}
              <div className="editor-actions">
                <button className="btn btn-sm" type="submit" disabled={pwBusy}>
                  {pwBusy ? '正在更新…' : '确认更新密码'}
                </button>
              </div>
            </form>
          </div>
        </section>

        <footer className="account-foot">
          <button className="btn btn-sm" type="button" onClick={finish}>
            修改完成
          </button>
        </footer>
      </div>
    </div>
  )
}
