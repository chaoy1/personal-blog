'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AdminPageHead from '@/components/AdminPageHead'
import { useAdminFeedback } from '@/components/admin/AdminFeedback'
import { runAdminAction } from '@/lib/admin-action'

type OwnerProfile = {
  id: string
  nickname: string
  bio: string
  avatar_url: string
}

type EditableProfile = {
  nickname: string
  bio: string
  avatar_url: string
}

type ProfileLoadState = 'loading' | 'ready' | 'error'
type ProfileSaveState = 'saved' | 'dirty' | 'saving' | 'error'
type AvatarState = 'idle' | 'uploading' | 'uploaded' | 'error'

const EMPTY_PROFILE: EditableProfile = { nickname: '', bio: '', avatar_url: '' }

export default function AdminProfile() {
  const router = useRouter()
  const { notify } = useAdminFeedback()
  const [profile, setProfile] = useState<OwnerProfile | null>(null)
  const [baseline, setBaseline] = useState<EditableProfile>(EMPTY_PROFILE)
  const [loaded, setLoaded] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loadState, setLoadState] = useState<ProfileLoadState>('loading')
  const [saveState, setSaveState] = useState<ProfileSaveState>('saved')
  const [avatarState, setAvatarState] = useState<AvatarState>('idle')
  const [loadAttempt, setLoadAttempt] = useState(0)

  const current = { nickname, bio, avatar_url: avatarUrl }
  const dirty = profile
    ? JSON.stringify(current) !== JSON.stringify(baseline)
    : Boolean(email.trim() || password || nickname.trim() || bio || avatarUrl)

  function applyProfile(data: OwnerProfile | null) {
    setProfile(data)
    const values = data
      ? { nickname: data.nickname ?? '', bio: data.bio ?? '', avatar_url: data.avatar_url ?? '' }
      : EMPTY_PROFILE
    setNickname(values.nickname)
    setBio(values.bio)
    setAvatarUrl(values.avatar_url)
    setBaseline(values)
  }

  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    setLoadState('loading')
    runAdminAction<OwnerProfile | null>(fetch('/api/admin/profile'), {
      onUnauthorized: () => router.replace(
        `/admin/login?next=${encodeURIComponent('/admin/profile')}`,
      ),
    })
      .then((data) => {
        if (!cancelled) {
          applyProfile(data)
          setSaveState('saved')
          setError('')
          setLoadState('ready')
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : '加载失败')
          setLoadState('error')
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [loadAttempt, router])

  function indentBio(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Tab') return
    event.preventDefault()
    const input = event.currentTarget
    const start = input.selectionStart
    const end = input.selectionEnd
    const indent = '　　'
    setBio((value) => `${value.slice(0, start)}${indent}${value.slice(end)}`)
    setSaveState('dirty')
    setError('')
    requestAnimationFrame(() => {
      input.selectionStart = input.selectionEnd = start + indent.length
    })
  }

  async function uploadAvatar(file: File) {
    if (!file.type.startsWith('image/')) {
      setAvatarState('error')
      setError('头像必须是图片文件')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarState('error')
      setError('头像不能超过 5MB')
      return
    }
    setBusy(true)
    setAvatarState('uploading')
    setError('')
    try {
      const form = new FormData()
      form.append('bucket', 'avatars')
      form.append('file', file)
      const result = await runAdminAction<{ url: string }>(
        fetch('/api/admin/upload', { method: 'POST', body: form }),
        { onUnauthorized: () => router.replace('/admin/login?next=%2Fadmin%2Fprofile') },
      )
      setAvatarUrl(result.url)
      setAvatarState('uploaded')
      setSaveState('dirty')
      notify({ kind: 'success', message: '头像已上传，保存资料后生效' })
    } catch (cause) {
      setAvatarState('error')
      setError(cause instanceof Error ? cause.message : '上传失败')
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!dirty || busy) return
    setBusy(true)
    setSaveState('saving')
    setError('')
    try {
      await runAdminAction(
        fetch('/api/admin/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            nickname,
            bio,
            avatar_url: avatarUrl,
          }),
        }),
        { onUnauthorized: () => router.replace('/admin/login?next=%2Fadmin%2Fprofile') },
      )
      const saved = await runAdminAction<OwnerProfile | null>(fetch('/api/admin/profile'), {
        onUnauthorized: () => router.replace('/admin/login?next=%2Fadmin%2Fprofile'),
      })
      applyProfile(saved)
      setEmail('')
      setPassword('')
      setSaveState('saved')
      notify({ kind: 'success', message: '博主资料已保存' })
    } catch (cause) {
      setSaveState('error')
      setError(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!loaded || !dirty) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty, loaded])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's' || !dirty || busy) return
      event.preventDefault()
      void save()
    }
    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [busy, dirty])

  const aboutLink = <Link href="/about" target="_blank" rel="noreferrer" className="btn btn-ghost">查看关于页 ↗</Link>

  if (!loaded) {
    return (
      <section className="admin-profile-page" role="region" aria-label="博主资料管理" data-page-state="loading">
        <AdminPageHead index="04" eyebrow="OWNER PROFILE" title="博主资料" description="这里的名字、头像和简介，会成为小屋主人的落款。" action={aboutLink} />
        <p className="hint" role="status">正在加载博主资料…</p>
        <div className="admin-profile-skeleton" aria-hidden="true"><div /><div /><div /></div>
      </section>
    )
  }

  if (loadState === 'error' && !profile) {
    return (
      <section className="admin-profile-page" role="region" aria-label="博主资料管理" data-page-state="error">
        <AdminPageHead index="04" eyebrow="OWNER PROFILE" title="博主资料" description="这里的名字、头像和简介，会成为小屋主人的落款。" action={aboutLink} />
        <div className="admin-profile-load-error" role="alert">
          <p>{error || '博主资料暂时无法加载。'}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLoadAttempt((value) => value + 1)}>重新加载</button>
        </div>
      </section>
    )
  }

  return (
    <section className="admin-profile-page" role="region" aria-label="博主资料管理" data-page-state={loadState}>
      <AdminPageHead
        index="04"
        eyebrow="OWNER PROFILE"
        title="博主资料"
        description="这里的名字、头像和简介，会成为小屋主人的落款。"
        action={aboutLink}
      />

      {!profile ? (
        <section className="admin-profile-identity" aria-label="公开身份">
          <div className="field">
          <p className="hint">
            还没有博主账号。创建后它会成为「关于我」页的主角，也能用于网站登录。
          </p>
          <div className="field">
            <label htmlFor="a-email">博主邮箱</label>
            <input
              id="a-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setSaveState('dirty')
                setError('')
              }}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="a-pass">密码（至少 6 位）</label>
            <input
              id="a-pass"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setSaveState('dirty')
                setError('')
              }}
              autoComplete="new-password"
            />
          </div>
        </div>
        </section>
      ) : null}

      <section className="admin-profile-identity" aria-label="公开身份">
      <div className="account-avatar">
        {avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={avatarUrl} alt="当前头像" />
        ) : (
          <span className="placeholder" aria-label="尚未设置头像">影</span>
        )}
        <label className="btn btn-ghost btn-sm">
          上传头像
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void uploadAvatar(file)
              event.target.value = ''
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
          onChange={(event) => {
            setNickname(event.target.value)
            setSaveState('dirty')
            setError('')
          }}
          placeholder="怎么称呼你？"
        />
      </div>
      </section>

      <section className="admin-profile-bio" aria-label="个人介绍正文">
      <div className="field">
        <label htmlFor="a-bio">个人简介（显示在「关于我」）</label>
        <textarea
          id="a-bio"
          aria-label="个人简介"
          value={bio}
          onChange={(event) => {
            setBio(event.target.value)
            setSaveState('dirty')
            setError('')
          }}
          onKeyDown={indentBio}
          placeholder="一行写一段；按 Tab 可插入中文段首缩进"
          style={{ minHeight: 120 }}
        />
        <p className="field-help">换行会按独立段落展示；Tab 会插入两个中文全角空格。</p>
      </div>
      </section>

      <div className="admin-profile-save-bar">
        <p className="profile-dirty-state" aria-live="polite">
          {dirty ? '有未保存更改' : '所有更改均已保存'}
        </p>
        <span className="profile-save-state" data-testid="profile-save-state" data-save-state={saveState} aria-live="polite">
          {saveState === 'saving' ? '正在保存' : saveState === 'error' ? '保存失败' : saveState === 'dirty' ? '待保存' : '已保存'}
        </span>
      </div>
      {error ? <p className="error-text" role="alert">{error}</p> : null}

      <div className="editor-actions">
        <button className="btn" type="button" onClick={() => void save()} disabled={busy || !dirty}>
          {busy ? '保存中…' : profile ? '保存资料' : '创建博主账号'}
        </button>
      </div>
      {avatarState === 'uploading' ? <p className="profile-upload-state" role="status">头像上传中…</p> : null}
    </section>
  )
}
