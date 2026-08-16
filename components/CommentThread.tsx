'use client'

import { useMemo, useState } from 'react'
import { formatDate } from '@/lib/blog'
import Avatar from '@/components/Avatar'

export type ThreadItem = {
  id: string
  user_id: string
  content: string
  parent_id: string | null
  created_at: string
  profiles: { nickname: string; avatar_url: string } | null
}

type Props = {
  /** 同一上下文（某篇文章 / 留言板当页 / 某条闲语）的全部评论，顺序即顶层展示顺序 */
  items: ThreadItem[]
  userId: string | null
  busy?: boolean
  emptyText?: string
  /** parentId 永远指向顶层评论；回复楼中楼时 content 已自动带上 @对方昵称 */
  onReply: (parentId: string, content: string) => Promise<string | null>
  onDelete?: (id: string) => void
}

/**
 * 评论区通用串楼组件（bilibili 风格）：
 * 所有回复都挂在顶层评论之下；回复楼中楼时，自动在新回复里 @被回复的人，
 * 因此可以在一条评论下持续追评，不受层级限制。
 */
export default function CommentThread({ items, userId, busy, emptyText, onReply, onDelete }: Props) {
  const [replyTo, setReplyTo] = useState<ThreadItem | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const { roots, rootIdOf, childrenOf } = useMemo(() => {
    const byId = new Map(items.map((i) => [i.id, i]))
    const rootIdOf = new Map<string, string>()
    for (const it of items) {
      let cur = it
      const guard = new Set<string>()
      while (cur.parent_id && byId.has(cur.parent_id) && !guard.has(cur.parent_id)) {
        guard.add(cur.id)
        cur = byId.get(cur.parent_id)!
      }
      rootIdOf.set(it.id, cur.id)
    }
    const roots: ThreadItem[] = []
    const childrenOf = new Map<string, ThreadItem[]>()
    for (const it of items) {
      const rootId = rootIdOf.get(it.id)!
      if (rootId === it.id) {
        roots.push(it)
      } else {
        const arr = childrenOf.get(rootId) ?? []
        arr.push(it)
        childrenOf.set(rootId, arr)
      }
    }
    for (const arr of childrenOf.values()) {
      arr.sort((a, b) => (a.created_at > b.created_at ? 1 : -1))
    }
    return { roots, rootIdOf, childrenOf }
  }, [items])

  function toggleReply(it: ThreadItem) {
    setError('')
    setReplyText('')
    setReplyTo((prev) => (prev?.id === it.id ? null : it))
  }

  async function submit(target: ThreadItem) {
    const text = replyText.trim()
    if (!text || sending) return
    const rootId = rootIdOf.get(target.id) ?? target.id
    const mention = rootId === target.id ? '' : `@${target.profiles?.nickname || '旅人'} `
    setSending(true)
    setError('')
    const err = await onReply(rootId, mention + text)
    setSending(false)
    if (err) {
      setError(err)
      return
    }
    setReplyText('')
    setReplyTo(null)
  }

  function renderReplyForm(target: ThreadItem) {
    return (
      <div className="reply-form">
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={`回复 ${target.profiles?.nickname || '旅人'}：`}
          rows={2}
          maxLength={500}
          autoFocus
        />
        <button
          className="btn btn-sm"
          type="button"
          disabled={sending || busy || !replyText.trim()}
          onClick={() => submit(target)}
        >
          {sending ? '回复中…' : '回复'}
        </button>
      </div>
    )
  }

  function renderItem(it: ThreadItem, isReply: boolean) {
    return (
      <div key={it.id} className={`comment${isReply ? ' reply' : ' reveal'}`}>
        <Avatar className={`c-avatar ${isReply ? 'sm' : 'md'}`} src={it.profiles?.avatar_url} />
        <div className="comment-body">
          <div className="comment-meta">
            <span className="comment-name">{it.profiles?.nickname || '旅人'}</span>
            <span className="comment-date">{formatDate(it.created_at)}</span>
            {userId ? (
              <button
                type="button"
                className="link-btn comment-reply-btn"
                onClick={() => toggleReply(it)}
              >
                {replyTo?.id === it.id ? '取消回复' : '回复'}
              </button>
            ) : null}
            {onDelete && userId === it.user_id ? (
              <button type="button" className="link-btn guestbook-del" onClick={() => onDelete(it.id)}>
                删除
              </button>
            ) : null}
          </div>
          <p className="comment-content">{it.content}</p>
          {replyTo?.id === it.id ? renderReplyForm(it) : null}
          {!isReply && childrenOf.has(it.id) ? (
            <div className="comment-replies">
              {childrenOf.get(it.id)!.map((child) => renderItem(child, true))}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <>
      {roots.map((root) => renderItem(root, false))}
      {error ? <p className="error-text">{error}</p> : null}
      {roots.length === 0 && emptyText ? <p className="comment-empty">{emptyText}</p> : null}
    </>
  )
}
