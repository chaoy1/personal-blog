'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminProfile() {
  const router = useRouter()
  const [profile, setProfile] = useState<{
    id: string
    nickname: string
    bio: string
    avatar_url: string
  } | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/profile')
      .then(async (res) => {
        if (res.status === 401) {
          router.replace('/admin/login')
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (!data) return
        setProfile(data)
        setNickname(data.nickname)
        setBio(data.bio)
        setAvatarUrl(data.avatar_url)
      })
      .catch(() => setError('加载失败'))
  }, [router])

  async function uploadAvatar(file: File) {
    setBusy(true)
    const form = new FormData()
    form.append('bucket', 'avatars')
    form.append('file', file)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
    setBusy(false)
    if (res.ok) {
      const { url } = await res.json()
      setAvatarUrl(url)
    } else {
      const j = await res.json().catch(() => ({}))
      setError(j.error || '上传失败')
    }
  }

  async function save() {
    setBusy(true)
    setError('')
    setMessage('')
    const res = await fetch('/api/admin/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        nickname,
        bio,
        avatar_url: avatarUrl,
      }),
    })
    setBusy(false)
    if (res.status === 401) {
      router.replace('/admin/login')
      return
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error || '保存失败')
      return
    }
    setMessage('已保存。此账号也可用于网站登录（说说、评论、上传）。')
  }

  return (
    <>
      <div className="admin-toolbar">
        <h1>博主资料</h1>
      </div>

      {!profile ? (
        <div className="field">
          <p className="hint">
            还没有博主账号。创建后它会成为「关于我」页的主角，也能用它在网站登录（发说说、评论、上传）。
          </p>
          <div className="field">
            <label htmlFor="a-email">博主邮箱</label>
            <input
              id="a-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label htmlFor="a-pass">密码（至少 6 位）</label>
            <input
              id="a-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      <div className="account-avatar">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="头像" />
        ) : (
          <span className="placeholder">影</span>
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
        <label htmlFor="a-name">昵称</label>
        <input
          id="a-name"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="怎么称呼你？"
        />
      </div>

      <div className="field">
        <label htmlFor="a-bio">个人简介（显示在「关于我」）</label>
        <textarea
          id="a-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          style={{ minHeight: 120 }}
        />
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {message ? <p className="notice-text">{message}</p> : null}

      <div className="editor-actions">
        <button className="btn" type="button" onClick={save} disabled={busy}>
          {busy ? '保存中…' : profile ? '保存资料' : '创建博主账号'}
        </button>
      </div>
    </>
  )
}
