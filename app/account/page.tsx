'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser, storagePublicUrl } from '@/lib/supabase-browser'
import { useAppStore } from '@/lib/app-store'
import Avatar from '@/components/Avatar'
import ArticleNav from '@/components/ArticleNav'

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export default function AccountPage() {
  const router = useRouter()
  const { ready, user, profile, updateProfile } = useAppStore()
  const [nickname, setNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [profileState, setProfileState] = useState<FormState>('idle')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [uploadState, setUploadState] = useState<FormState>('idle')
  const [uploadError, setUploadError] = useState('')
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordState, setPasswordState] = useState<FormState>('idle')
  const [pwMessage, setPwMessage] = useState('')
  const [pwError, setPwError] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const uploadRequestId = useRef(0)
  const passwordRequestId = useRef(0)
  const busy = profileState === 'submitting'
  const pwBusy = passwordState === 'submitting'
  const uploadBusy = uploadState === 'submitting'

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

  function startAvatarUpload(file: File) {
    const requestId = ++uploadRequestId.current
    setPendingAvatarFile(file)
    setProfileState('idle')
    void uploadAvatar(file, requestId)
  }

  async function uploadAvatar(file: File, requestId: number) {
    if (!user) return
    setUploadState('submitting')
    setUploadError('')
    setError('')
    setMessage('')
    const ext = file.name.split('.').pop() || 'png'
    const path = `${user.id}/${Date.now()}.${ext}`
    try {
      const { error: uploadErr } = await supabaseBrowser()
        .storage.from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' })
      if (requestId !== uploadRequestId.current) return
      if (uploadErr) {
        setUploadError(`头像上传失败：${uploadErr.message}`)
        setUploadState('error')
        return
      }
      setAvatarUrl(storagePublicUrl('avatars', path))
      setPendingAvatarFile(null)
      setUploadState('success')
    } catch {
      if (requestId !== uploadRequestId.current) return
      setUploadError('头像上传失败，请稍后再试')
      setUploadState('error')
    }
  }

  function retryAvatarUpload() {
    if (pendingAvatarFile) startAvatarUpload(pendingAvatarFile)
  }

  async function save() {
    if (!user || uploadBusy) return
    setProfileState('submitting')
    setError('')
    setMessage('')
    const err = await updateProfile({ nickname: nickname.trim(), avatar_url: avatarUrl })
    if (err) {
      setError(err)
      setProfileState('error')
      return
    }
    setMessage('资料已保存')
    setProfileState('success')
  }

  async function changePassword() {
    if (!user?.email) {
      setPwError('当前账号无法修改密码')
      setPasswordState('error')
      return
    }
    const payload = { oldPassword, newPassword, confirmPassword }
    if (payload.newPassword.length < 6) {
      setPwError('新密码至少需要 6 位')
      setPasswordState('error')
      return
    }
    if (payload.newPassword !== payload.confirmPassword) {
      setPwError('两次输入的新密码不一致')
      setPasswordState('error')
      return
    }
    const requestId = ++passwordRequestId.current
    setPasswordState('submitting')
    setPwError('')
    setPwMessage('')
    try {
      const sb = supabaseBrowser()
      const { error: verifyErr } = await sb.auth.signInWithPassword({
        email: user.email,
        password: payload.oldPassword,
      })
      if (requestId !== passwordRequestId.current) return
      if (verifyErr) {
        setPwError('旧密码不正确')
        setPasswordState('error')
        return
      }
      if (requestId !== passwordRequestId.current) return
      const { error: updateErr } = await sb.auth.updateUser({ password: payload.newPassword })
      if (requestId !== passwordRequestId.current) return
      if (updateErr) {
        setPwError(`修改失败：${updateErr.message}`)
        setPasswordState('error')
        return
      }
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPwMessage('密码已修改')
      setPasswordState('success')
    } catch {
      if (requestId !== passwordRequestId.current) return
      setPwError('修改失败，请稍后再试')
      setPasswordState('error')
    }
  }

  function updatePasswordField(setValue: (value: string) => void, value: string) {
    if (pwBusy) {
      passwordRequestId.current += 1
      setPasswordState('idle')
      setPwError('')
      setPwMessage('')
    }
    setValue(value)
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
      <ArticleNav current="个人资料" />

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
            <div className="account-avatar" aria-busy={uploadBusy} data-form-state={uploadState}>
              <Avatar src={avatarUrl} alt="头像" />
              <label className="account-avatar-btn">
                更换头像
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) startAvatarUpload(f)
                  }}
                />
              </label>
              {uploadState === 'error' && pendingAvatarFile ? (
                <button className="btn btn-ghost btn-sm" type="button" onClick={retryAvatarUpload} disabled={uploadBusy}>
                  重试上传头像
                </button>
              ) : null}
              {uploadError ? <p className="error-text" role="alert">{uploadError}</p> : null}
              {uploadState === 'success' ? <p className="notice-text" role="status">头像已上传</p> : null}
            </div>

            <div className="account-profile-fields" aria-busy={busy || uploadBusy} data-form-state={uploadBusy ? 'submitting' : profileState}>
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
              {error ? <p className="error-text" role="alert">{error}</p> : null}
              {message ? <p className="notice-text" role="status">{message}</p> : null}
              <div className="editor-actions">
                <button className="btn btn-sm" type="button" onClick={save} disabled={busy || uploadBusy}>
                  {busy ? '保存中…' : '保存资料'}
                </button>
                {profileState === 'error' ? (
                  <button className="btn btn-ghost btn-sm" type="button" onClick={save} disabled={busy || uploadBusy}>
                    重试保存资料
                  </button>
                ) : null}
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
              aria-busy={pwBusy}
              data-form-state={passwordState}
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
                    onChange={(e) => updatePasswordField(setOldPassword, e.target.value)}
                    autoComplete="current-password"
                    placeholder="输入当前密码"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((value) => !value)}
                    aria-label={showPasswords ? '隐藏密码' : '显示密码'}
                    title={showPasswords ? '隐藏密码' : '显示密码'}
                    aria-pressed={showPasswords}
                  >
                    {showPasswords ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.3A10.8 10.8 0 0112 4c5.5 0 9 5.2 9 5.2a14.5 14.5 0 01-3.1 3.5M6.2 6.2C4.2 7.6 3 9.2 3 9.2S6.5 14.4 12 14.4c1 0 1.9-.2 2.7-.5" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 12s3.5-5.2 9-5.2 9 5.2 9 5.2-3.5 5.2-9 5.2S3 12 3 12z" />
                        <circle cx="12" cy="12" r="2.4" />
                      </svg>
                    )}
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
                    onChange={(e) => updatePasswordField(setNewPassword, e.target.value)}
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
                    onChange={(e) => updatePasswordField(setConfirmPassword, e.target.value)}
                    autoComplete="new-password"
                    placeholder="保持两次输入一致"
                  />
                </div>
              </div>
              {pwError ? <p className="error-text account-pw-status" role="alert">{pwError}</p> : null}
              {pwMessage ? <p className="notice-text account-pw-status" role="status">{pwMessage}</p> : null}
              <div className="editor-actions">
                <button className="btn btn-sm" type="submit" disabled={pwBusy}>
                  {pwBusy ? '正在更新…' : '确认更新密码'}
                </button>
                {passwordState === 'error' ? (
                  <button className="btn btn-ghost btn-sm" type="button" onClick={changePassword} disabled={pwBusy}>
                    重试更新密码
                  </button>
                ) : null}
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
