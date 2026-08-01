'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser, storagePublicUrl } from '@/lib/supabase-browser'
import { formatDate } from '@/lib/blog'

type Moment = {
  id: string
  user_id: string
  content: string
  images: string[]
  created_at: string
  profiles: { nickname: string; avatar_url: string } | null
}

export default function MomentsPage() {
  const [moments, setMoments] = useState<Moment[]>([])
  const [session, setSession] = useState<{ user: { id: string } } | null>(null)
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const sb = supabaseBrowser()
    const { data, error } = await sb
      .from('moments')
      .select('*, profiles(nickname, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(60)
    if (error) {
      setError('讀取說說失敗：' + error.message)
      return
    }
    setMoments((data ?? []) as unknown as Moment[])
  }, [])

  useEffect(() => {
    const sb = supabaseBrowser()
    sb.auth
      .getSession()
      .then(({ data }) => setSession((data.session as { user: { id: string } } | null) ?? null))
    load().catch(() => setError('數據庫尚未初始化，請運行 supabase/schema-v2.sql'))
  }, [load])

  async function uploadImages(files: FileList | null) {
    if (!files || !session) return
    setBusy(true)
    const urls: string[] = []
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabaseBrowser()
        .storage.from('moments')
        .upload(path, file, { upsert: true, cacheControl: '3600' })
      if (!error) urls.push(storagePublicUrl('moments', path))
    }
    setImages((prev) => [...prev, ...urls])
    setBusy(false)
  }

  async function post() {
    if (!session || (!content.trim() && images.length === 0)) return
    setBusy(true)
    setError('')
    const { error } = await supabaseBrowser().from('moments').insert({
      user_id: session.user.id,
      content: content.trim(),
      images,
    })
    setBusy(false)
    if (error) {
      setError('發布失敗：' + error.message)
      return
    }
    setContent('')
    setImages([])
    load()
  }

  async function remove(id: string) {
    if (!window.confirm('確定刪除這條說說？')) return
    await supabaseBrowser().from('moments').delete().eq('id', id)
    load()
  }

  return (
    <div className="wrap">
      <nav className="article-nav">
        <Link href="/">← 返回首頁</Link>
        <span>說說</span>
      </nav>

      <article className="article">
        <p className="eyebrow">MOMENTS</p>
        <h1>
          說說
          <span className="article-seal" aria-hidden="true">
            言
          </span>
        </h1>
        <div className="divider-ornament" aria-hidden="true">
          ※ ※ ※
        </div>

        {session ? (
          <div className="moments-composer">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="此刻想說點什麼…"
            />
            {images.length > 0 ? (
              <div className="moments-images">
                {images.map((u, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={u} alt="配圖" />
                ))}
              </div>
            ) : null}
            <div className="moments-actions">
              <label className="btn btn-ghost btn-sm">
                配圖
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => uploadImages(e.target.files)}
                />
              </label>
              <button className="btn btn-sm" type="button" onClick={post} disabled={busy}>
                {busy ? '處理中…' : '發布'}
              </button>
            </div>
          </div>
        ) : (
          <p className="moments-login-tip">
            <Link href="/login">登錄</Link> 後即可發布說說。
          </p>
        )}

        {error ? <p className="error-text">{error}</p> : null}

        <div className="moments-list">
          {moments.map((m) => (
            <div key={m.id} className="moment">
              <div className="moment-head">
                {m.profiles?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="moment-avatar" src={m.profiles.avatar_url} alt="頭像" />
                ) : (
                  <span className="moment-avatar placeholder">影</span>
                )}
                <div>
                  <span className="moment-name">{m.profiles?.nickname || '旅人'}</span>
                  <span className="moment-date">{formatDate(m.created_at)}</span>
                </div>
                {session?.user.id === m.user_id ? (
                  <button type="button" className="link-btn moment-del" onClick={() => remove(m.id)}>
                    刪除
                  </button>
                ) : null}
              </div>
              {m.content ? <p className="moment-content">{m.content}</p> : null}
              {m.images.length > 0 ? (
                <div className="moment-images">
                  {m.images.map((u, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={u} alt="說說配圖" />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {moments.length === 0 && !error ? (
            <p className="moments-empty">還沒有說說，來寫下第一句吧。</p>
          ) : null}
        </div>
      </article>
    </div>
  )
}
