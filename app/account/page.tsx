'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser, storagePublicUrl } from '@/lib/supabase-browser'

type Profile = {
  id: string
  nickname: string
  bio: string
  avatar_url: string
  role: string
}

export default function AccountPage() {
  const router = useRouter()
  const [session, setSession] = useState<{ user: { id: string } } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [nickname, setNickname] = useState('')
  const [bio, setBio] = useState('')
  const [role, setRole] = useState('user')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const sb = supabaseBrowser()
    sb.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user
      if (!user) {
        router.replace('/login')
        return
      }
      setSession({ user })
      const { data: prof } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (prof) {
        setProfile(prof)
        setNickname(prof.nickname)
        setBio(prof.bio)
        setRole(prof.role)
        setAvatarUrl(prof.avatar_url)
      }
    })
  }, [router])

  async function uploadAvatar(file: File) {
    if (!session) return
    const ext = file.name.split('.').pop() || 'png'
    const path = `${session.user.id}/${Date.now()}.${ext}`
    const { error } = await supabaseBrowser()
      .storage.from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '3600' })
    if (error) {
      setError('头像上传失败：' + error.message)
      return
    }
    setAvatarUrl(storagePublicUrl('avatars', path))
  }

  async function save() {
    if (!session) return
    setBusy(true)
    setError('')
    setMessage('')
    const { error } = await supabaseBrowser()
      .from('profiles')
      .upsert({ id: session.user.id, nickname, bio, role, avatar_url: avatarUrl })
    setBusy(false)
    if (error) {
      setError('保存失败：' + error.message)
      return
    }
    setMessage('已保存。')
  }

  async function logout() {
    await supabaseBrowser().auth.signOut()
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
        <h1>个人资料</h1>
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

        <div className="field">
          <label htmlFor="bio">个人简介（会显示在「关于我」）</label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="几句话介绍自己…"
            style={{ minHeight: 120 }}
          />
        </div>

        <label className="check-row">
          <input
            type="checkbox"
            checked={role === 'owner'}
            onChange={(e) => setRole(e.target.checked ? 'owner' : 'user')}
          />
          我是博主本人（勾选后，「关于我」页展示我的资料）
        </label>

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
      </div>
    </div>
  )
}
