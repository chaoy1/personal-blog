'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser, storagePublicUrl } from '@/lib/supabase-browser'
import { formatDate } from '@/lib/blog'
import ScrollFX from '@/components/ScrollFX'

type Moment = {
  id: string
  user_id: string
  content: string
  images: string[]
  created_at: string
  profiles: { nickname: string; avatar_url: string } | null
}

type MomentComment = {
  id: string
  moment_id: string
  user_id: string
  content: string
  created_at: string
  profiles: { nickname: string; avatar_url: string } | null
}

type MomentLike = {
  moment_id: string
  user_id: string
}

export default function MomentsPage() {
  const [moments, setMoments] = useState<Moment[]>([])
  const [comments, setComments] = useState<MomentComment[]>([])
  const [likes, setLikes] = useState<MomentLike[]>([])
  const [session, setSession] = useState<{ user: { id: string; email?: string } } | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const sb = supabaseBrowser()
    const { data, error } = await sb
      .from('moments')
      .select('*, profiles!moments_user_id_fkey(nickname, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(60)
    if (error) {
      setError('读取说说失败：' + error.message)
      return
    }
    const list = (data ?? []) as unknown as Moment[]
    setMoments(list)

    const ids = list.map((m) => m.id)
    if (ids.length > 0) {
      const { data: likesData } = await sb
        .from('moment_likes')
        .select('moment_id, user_id')
        .in('moment_id', ids)
      setLikes((likesData ?? []) as unknown as MomentLike[])

      const { data: commentsData } = await sb
        .from('moment_comments')
        .select('*, profiles!moment_comments_user_id_fkey(nickname, avatar_url)')
        .in('moment_id', ids)
        .order('created_at', { ascending: true })
      setComments((commentsData ?? []) as unknown as MomentComment[])
    } else {
      setLikes([])
      setComments([])
    }
  }, [])

  useEffect(() => {
    const sb = supabaseBrowser()
    sb.auth
      .getSession()
      .then(async ({ data }) => {
        const user = (data.session?.user as { id: string; email?: string } | undefined) ?? null
        setSession(user ? { user } : null)
        if (user) {
          const { data: prof } = await sb
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()
          setIsOwner(prof?.role === 'owner')
        }
      })
      .catch(() => {})
    load().catch(() => setError('数据库尚未初始化，请运行 supabase/schema-v2.sql 与 schema-v3.sql'))
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
    if (!session || !isOwner || (!content.trim() && images.length === 0)) return
    setBusy(true)
    setError('')
    const { error } = await supabaseBrowser().from('moments').insert({
      user_id: session.user.id,
      content: content.trim(),
      images,
    })
    setBusy(false)
    if (error) {
      setError('发布失败：' + error.message)
      return
    }
    setContent('')
    setImages([])
    load()
  }

  async function remove(id: string) {
    if (!window.confirm('确定删除这条说说？')) return
    await supabaseBrowser().from('moments').delete().eq('id', id)
    load()
  }

  async function toggleLike(momentId: string) {
    if (!session) return
    const sb = supabaseBrowser()
    const mine = likes.find((l) => l.moment_id === momentId && l.user_id === session.user.id)
    if (mine) {
      await sb.from('moment_likes').delete().match({ moment_id: momentId, user_id: session.user.id })
    } else {
      await sb.from('moment_likes').insert({ moment_id: momentId, user_id: session.user.id })
    }
    const { data } = await sb.from('moment_likes').select('moment_id, user_id').in(
      'moment_id',
      moments.map((m) => m.id)
    )
    if (data) setLikes(data as unknown as MomentLike[])
  }

  async function sendComment(momentId: string) {
    const text = (commentText[momentId] ?? '').trim()
    if (!session || !text) return
    const sb = supabaseBrowser()
    const { error } = await sb.from('moment_comments').insert({
      moment_id: momentId,
      user_id: session.user.id,
      content: text,
    })
    if (error) {
      setError('评论失败：' + error.message)
      return
    }
    setCommentText((prev) => ({ ...prev, [momentId]: '' }))
    const { data } = await sb
      .from('moment_comments')
      .select('*, profiles!moment_comments_user_id_fkey(nickname, avatar_url)')
      .in(
        'moment_id',
        moments.map((m) => m.id)
      )
      .order('created_at', { ascending: true })
    if (data) setComments(data as unknown as MomentComment[])
  }

  return (
    <div className="wrap">
      <ScrollFX />
      <nav className="article-nav">
        <Link href="/">← 返回首页</Link>
        <span>说说</span>
      </nav>

      <article className="article">
        <p className="eyebrow">MOMENTS</p>
        <h1>
          说说
          <span className="article-seal" aria-hidden="true">
            言
          </span>
        </h1>
        <div className="divider-ornament" aria-hidden="true">
          ※ ※ ※
        </div>

        {session && isOwner ? (
          <div className="moments-composer">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="此刻想说点什么…"
            />
            {images.length > 0 ? (
              <div className="moments-images">
                {images.map((u, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={u} alt="配图" />
                ))}
              </div>
            ) : null}
            <div className="moments-actions">
              <label className="btn btn-ghost btn-sm">
                配图
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => uploadImages(e.target.files)}
                />
              </label>
              <button className="btn btn-sm" type="button" onClick={post} disabled={busy}>
                {busy ? '处理中…' : '发布'}
              </button>
            </div>
          </div>
        ) : (
          <p className="moments-login-tip">
            {session ? (
              '说说由博主发布，欢迎点赞和评论。'
            ) : (
              <>
                <Link href="/login">登录</Link> 后可以点赞和评论。
              </>
            )}
          </p>
        )}

        {error ? <p className="error-text">{error}</p> : null}

        <div className="moments-list">
          {moments.map((m) => {
            const likeCount = likes.filter((l) => l.moment_id === m.id).length
            const liked = session
              ? likes.some((l) => l.moment_id === m.id && l.user_id === session.user.id)
              : false
            const mComments = comments.filter((c) => c.moment_id === m.id)

            return (
              <div key={m.id} className="moment reveal">
                <div className="moment-head">
                  {m.profiles?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="moment-avatar" src={m.profiles.avatar_url} alt="头像" />
                  ) : (
                    <span className="moment-avatar placeholder">影</span>
                  )}
                  <div>
                    <span className="moment-name">{m.profiles?.nickname || '旅人'}</span>
                    <span className="moment-date">{formatDate(m.created_at)}</span>
                  </div>
                  {session?.user.id === m.user_id && isOwner ? (
                    <button type="button" className="link-btn moment-del" onClick={() => remove(m.id)}>
                      删除
                    </button>
                  ) : null}
                </div>
                {m.content ? <p className="moment-content">{m.content}</p> : null}
                {m.images.length > 0 ? (
                  <div className="moment-images">
                    {m.images.map((u, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={u} alt="说说配图" />
                    ))}
                  </div>
                ) : null}

                <div className="moment-actions">
                  <button
                    type="button"
                    className={`moment-like${liked ? ' liked' : ''}`}
                    onClick={() => toggleLike(m.id)}
                    disabled={!session}
                  >
                    {liked ? '♥ 已赞' : '♡ 点赞'} · {likeCount}
                  </button>
                  <span className="moment-stat">评论 {mComments.length}</span>
                </div>

                <div className="moment-comments">
                  {mComments.map((c) => (
                    <div key={c.id} className="moment-comment">
                      {c.profiles?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="c-avatar sm" src={c.profiles.avatar_url} alt="头像" />
                      ) : (
                        <span className="c-avatar sm placeholder">影</span>
                      )}
                      <div className="comment-body">
                        <div className="comment-meta">
                          <span className="comment-name">{c.profiles?.nickname || '旅人'}</span>
                          <span className="comment-date">{formatDate(c.created_at)}</span>
                        </div>
                        <p className="comment-content">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  {session ? (
                    <div className="moment-comment-form">
                      <input
                        type="text"
                        value={commentText[m.id] ?? ''}
                        onChange={(e) =>
                          setCommentText((prev) => ({ ...prev, [m.id]: e.target.value }))
                        }
                        placeholder="评论一下…"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') sendComment(m.id)
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => sendComment(m.id)}
                        disabled={busy || !(commentText[m.id] ?? '').trim()}
                      >
                        发送
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
          {moments.length === 0 && !error ? (
            <p className="moments-empty">还没有说说。</p>
          ) : null}
        </div>
      </article>
    </div>
  )
}
