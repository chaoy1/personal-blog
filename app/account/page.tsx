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

  async function logout() {
    await signOut()
    router.replace('/')
    router.refresh()
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
    // 先验证旧密码，确认是本人在操作
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

  return (
    <div className="account-wrap">
      <nav className="article-nav">
        <Link href="/">← 返回首页</Link>
        <span>个人资料</span>
      </nav>

      <div className="account-card">
        <h1>个人资料</h1>
        {user?.email ? <p className="hint">账号：{user.email}</p> : null}
        <div className="account-avatar">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="头像" />
          ) : (
            <span>影</span>
          )}
          <label className="btn btn-ghost btn-sm">
            上传头像
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

        <div className="field">
          <label htmlFor="nickname">昵称</label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="notice-text">{message}</p> : null}

        <div className="editor-actions">
          <button className="btn" type="button" onClick={save} disabled={busy}>
            {busy ? '保存中…' : '保存资料'}
          </button>
          <button className="btn btn-ghost" type="button" onClick={logout}>
            退出登录
          </button>
        </div>

        <hr className="account-divider" />
        <h2 className="account-sub-title">修改密码</h2>
        <div className="field">
          <label htmlFor="old-password">旧密码</label>
          <input
            id="old-password"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            autoComplete="current-password"
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
          />
        </div>
        {pwError ? <p className="error-text">{pwError}</p> : null}
        {pwMessage ? <p className="notice-text">{pwMessage}</p> : null}
        <div className="editor-actions">
          <button className="btn" type="button" onClick={changePassword} disabled={pwBusy}>
            {pwBusy ? '修改中…' : '修改密码'}
          </button>
        </div>
      </div>
    </div>
  )
}
