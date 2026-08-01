'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser, storagePublicUrl } from '@/lib/supabase-browser'
import { formatDate } from '@/lib/blog'

type Photo = {
  id: string
  user_id: string
  url: string
  caption: string
  created_at: string
}

export default function AlbumPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [session, setSession] = useState<{ user: { id: string } } | null>(null)
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const sb = supabaseBrowser()
    const { data, error } = await sb
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) {
      setError('讀取相冊失敗：' + error.message)
      return
    }
    setPhotos(data ?? [])
  }, [])

  useEffect(() => {
    const sb = supabaseBrowser()
    sb.auth
      .getSession()
      .then(({ data }) => setSession((data.session as { user: { id: string } } | null) ?? null))
    load().catch(() => setError('數據庫尚未初始化，請運行 supabase/schema-v2.sql'))
  }, [load])

  async function upload(files: FileList | null) {
    if (!files || !session) return
    setBusy(true)
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabaseBrowser()
        .storage.from('photos')
        .upload(path, file, { upsert: true, cacheControl: '3600' })
      if (error) {
        setError('上傳失敗：' + error.message)
        continue
      }
      try {
        await supabaseBrowser()
          .from('photos')
          .insert({
            user_id: session.user.id,
            url: storagePublicUrl('photos', path),
            caption: caption.trim(),
          })
      } catch {
        // ignore
      }
    }
    setBusy(false)
    setCaption('')
    load()
  }

  async function remove(id: string) {
    if (!window.confirm('確定刪除這張照片？')) return
    await supabaseBrowser().from('photos').delete().eq('id', id)
    load()
  }

  return (
    <div className="wrap">
      <nav className="article-nav">
        <Link href="/">← 返回首頁</Link>
        <span>相冊</span>
      </nav>

      <article className="article" style={{ maxWidth: 880 }}>
        <p className="eyebrow">ALBUM</p>
        <h1>
          相冊
          <span className="article-seal" aria-hidden="true">
            影
          </span>
        </h1>
        <div className="divider-ornament" aria-hidden="true">
          ※ ※ ※
        </div>

        {session ? (
          <div className="album-upload">
            <input
              type="text"
              className="album-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="照片說明（可留空）"
            />
            <label className="btn btn-sm">
              {busy ? '上傳中…' : '＋ 上傳照片'}
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                disabled={busy}
                onChange={(e) => upload(e.target.files)}
              />
            </label>
          </div>
        ) : (
          <p className="moments-login-tip">
            <Link href="/login">登錄</Link> 後即可上傳照片。
          </p>
        )}

        {error ? <p className="error-text">{error}</p> : null}

        <div className="album-grid">
          {photos.map((photo) => (
            <figure key={photo.id} className="album-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.caption || '照片'} loading="lazy" />
              {photo.caption ? <figcaption>{photo.caption}</figcaption> : null}
              <span className="album-date">{formatDate(photo.created_at)}</span>
              {session?.user.id === photo.user_id ? (
                <button
                  type="button"
                  className="album-del"
                  onClick={() => remove(photo.id)}
                  aria-label="刪除照片"
                >
                  ×
                </button>
              ) : null}
            </figure>
          ))}
        </div>
        {photos.length === 0 && !error ? (
          <p className="moments-empty">相冊還空著，上傳第一張照片吧。</p>
        ) : null}
      </article>
    </div>
  )
}
