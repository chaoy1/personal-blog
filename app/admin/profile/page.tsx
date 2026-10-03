'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MarkdownView from '@/components/MarkdownView'
import { getAboutSections } from '@/lib/about-content'
import './profile-paper.css'
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
  const revision = useRef(0)
  const busyRef = useRef(false)
  const bioInput = useRef<HTMLTextAreaElement>(null)

  function changed() {
    revision.current += 1
    setSaveState('dirty')
    setError('')
  }

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

  function formatBio(prefix: string, suffix = '', fallback = '文字') {
    const input = bioInput.current
    if (!input) return
    const start = input.selectionStart
    const end = input.selectionEnd
    const selected = bio.slice(start, end) || fallback
    setBio(`${bio.slice(0, start)}${prefix}${selected}${suffix}${bio.slice(end)}`)
    changed()
    requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
    })
  }

  async function uploadAvatar(file: File) {
    if (busyRef.current) return
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
    busyRef.current = true
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
      revision.current += 1
      setAvatarState('uploaded')
      setSaveState('dirty')
      notify({ kind: 'success', message: '头像已上传，保存资料后生效' })
    } catch (cause) {
      setAvatarState('error')
      setError(cause instanceof Error ? cause.message : '上传失败')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  async function save() {
    if (!dirty || busyRef.current) return
    busyRef.current = true
    const savingRevision = revision.current
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
      if (revision.current === savingRevision) {
        applyProfile(saved)
        setSaveState('saved')
      } else {
        setProfile(saved)
        setBaseline(saved ? { nickname: saved.nickname ?? '', bio: saved.bio ?? '', avatar_url: saved.avatar_url ?? '' } : EMPTY_PROFILE)
        setSaveState('dirty')
      }
      setEmail('')
      setPassword('')
      notify({ kind: 'success', message: '博主资料已保存' })
    } catch (cause) {
      setSaveState('error')
      setError(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      busyRef.current = false
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
  })

  const aboutLink = <Link href="/about" target="_blank" rel="noreferrer" className="ap-button">查看关于页 ↗</Link>
  const head = <header className="ap-page-head"><div><p className="ap-eyebrow">OWNER PROFILE / 小屋落款</p><h1>字里行间，留一个你。</h1><p className="ap-description">名字、头像与自序，是这间小屋递给来人的第一封信。</p></div>{aboutLink}</header>
  if (!loaded) return <section className="ap-profile-page" role="region" aria-label="博主资料管理" data-page-state="loading">{head}<p className="ap-feedback" role="status">正在加载博主资料…</p></section>
  if (loadState === 'error' && !profile) return <section className="ap-profile-page" role="region" aria-label="博主资料管理" data-page-state="error">{head}<div className="ap-feedback" role="alert"><p>{error || '博主资料暂时无法加载。'}</p><button type="button" className="ap-button" onClick={() => setLoadAttempt(value => value + 1)}>重新加载</button></div></section>
  const avatar = avatarUrl ? <img src={avatarUrl} alt="当前头像" /> : <span className="ap-profile-monogram" role="img" aria-label="尚未设置头像">{Array.from(nickname)[0] || '影'}</span>
  const preview = getAboutSections(bio)
  return <section className="ap-profile-page" role="region" aria-label="博主资料管理" data-page-state={loadState}>
    {head}
    <div className="ap-profile-workspace">
      <form className="ap-sheet ap-profile-manuscript" onSubmit={event => { event.preventDefault(); void save() }} aria-label="博主资料表单">
        <header className="ap-sheet-head"><div><p className="ap-eyebrow">01 / IDENTITY & PREFACE</p><h2>落款与自序</h2></div><span className="ap-chip">{profile ? '已建档' : '首次建档'}</span></header>
        {!profile && <section className="ap-profile-create" aria-label="首次建档"><p className="ap-status">还没有博主账号。创建后可用于网站登录，也会成为关于页的主角。</p><div className="ap-profile-account-fields"><label className="ap-control"><span>博主邮箱</span><input type="email" value={email} required disabled={busy} onChange={event => { setEmail(event.target.value); changed() }} autoComplete="email" placeholder="you@example.com" /></label><label className="ap-control"><span>密码（至少 6 位）</span><input type="password" value={password} required minLength={6} disabled={busy} onChange={event => { setPassword(event.target.value); changed() }} autoComplete="new-password" /></label></div></section>}
        <section className="ap-profile-identity" aria-label="公开身份">
          <div className="ap-profile-avatar-frame">{avatar}<span>小屋主人</span></div>
          <div className="ap-profile-identity-fields"><label className="ap-control"><span>昵称</span><input aria-label="昵称" value={nickname} onChange={event => { setNickname(event.target.value); changed() }} placeholder="怎么称呼你？" required maxLength={40} /><small>显示在文章落款与关于页。</small></label><div className="ap-profile-avatar-controls"><label className="ap-button">上传头像<input className="ap-sr" type="file" accept="image/*" aria-label="上传头像" disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); event.target.value = '' }} /></label><span>图片 · 不超过 5 MB</span></div>{avatarState === 'uploading' && <p className="ap-status" role="status">头像上传中…</p>}</div>
        </section>
        <section className="ap-profile-writing" aria-label="个人介绍正文">
          <div className="ap-profile-writing-head"><label htmlFor="profile-bio">小屋自序 · Markdown</label><span>{Array.from(bio).length} 字</span></div>
          <div className="ap-profile-md-toolbar" role="toolbar" aria-label="Markdown 格式工具">
            <button type="button" onClick={() => formatBio('\n## ', '\n', '标题')}>二级标题</button><button type="button" onClick={() => formatBio('**', '**')}>加粗</button><button type="button" onClick={() => formatBio('*', '*')}>斜体</button><button type="button" onClick={() => formatBio('\n- ', '\n', '列表项')}>列表</button><button type="button" onClick={() => formatBio('\n> ', '\n', '引用')}>引用</button><button type="button" onClick={() => formatBio('[', '](https://example.com)', '链接文字')}>链接</button><button type="button" onClick={() => formatBio('\n```\n', '\n```\n', '代码')}>代码块</button>
          </div>
          <textarea ref={bioInput} id="profile-bio" aria-label="个人简介" aria-describedby="profile-markdown-help" spellCheck={false} value={bio} onChange={event => { setBio(event.target.value); changed() }} placeholder={'## 寻常日子，认真过。\n\n在这里，写下你的自序。'} />
          <p id="profile-markdown-help" className="ap-profile-writing-help">支持 Markdown 标题、列表、引用、链接、表格与代码块；右侧预览随书写更新。Ctrl / ⌘ + S 保存。</p>
        </section>
        {error && <p className="ap-error" role="alert">{error}</p>}
        <footer className="ap-profile-save"><div className="ap-status"><p aria-live="polite">{dirty ? '有未保存更改' : '所有更改均已保存'}</p><span className="ap-profile-save-state" data-testid="profile-save-state" data-save-state={saveState} aria-live="polite">{saveState === 'saving' ? '正在保存' : saveState === 'error' ? '保存失败' : saveState === 'dirty' ? '待保存' : '已保存'}</span></div><div className="ap-toolbar"><button type="button" className="ap-quiet" disabled={busy || !dirty} onClick={() => { revision.current += 1; setNickname(baseline.nickname); setBio(baseline.bio); setAvatarUrl(baseline.avatar_url); setSaveState('saved'); setError('') }}>还原这一稿</button><button className="ap-primary" type="submit" disabled={busy || !dirty}>{busy ? '保存中…' : profile ? '保存资料' : '创建博主账号'}</button></div></footer>
      </form>
      <aside className="ap-profile-preview-column"><div className="ap-profile-preview-label"><span>02 / 留给来人的模样</span><i aria-hidden="true">署</i></div>
        <article className="ap-item ap-profile-card" role="region" aria-label="资料预览"><p className="ap-eyebrow">THE ONE BEHIND THE WORDS</p><div className="ap-profile-card-avatar">{avatarUrl ? <img src={avatarUrl} alt="头像预览" /> : <span className="ap-profile-monogram" aria-hidden="true">{Array.from(nickname)[0] || '影'}</span>}<span>小屋主人</span><i className="desk-seal" aria-hidden="true">署</i></div><h2 id="profile-preview-name">{nickname || '小屋主人'}</h2><p className="ap-profile-card-subtitle">博主 · 似水流年</p><div id="profile-preview-bio" tabIndex={0}>{bio.trim() ? <MarkdownView content={bio} preserveParagraphs={preview.preserveParagraphs} /> : <p className="ap-status">写下自序，让来人认识你。</p>}</div><footer>文字 / 日常 / 风景 <i aria-hidden="true">记</i></footer></article>
        <p className="ap-profile-preview-foot">窗前有纸，纸上有你。<span>此处为实时资料预览，保存后在前台生效。</span></p>
      </aside>
    </div><footer className="ap-footer"><span>落款与自序 · 慢慢写成篇</span><span>写于似水流年</span></footer>
  </section>
}
