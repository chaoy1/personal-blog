'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  compareDrafts,
  readDraft,
  removeDraft,
  writeDraft,
  type ArticleDraftSnapshot,
} from '@/lib/article-draft'
import { runAdminAction } from '@/lib/admin-action'

export type ArticleDraftSyncStatus =
  | 'idle'
  | 'local-saved'
  | 'server-saving'
  | 'server-saved'
  | 'error'
  | 'conflict'

type SyncInput = {
  snapshot: ArticleDraftSnapshot
  onPostId(id: string): void
  onUnauthorized(): void
}

type SaveResult = {
  postId: string
  updatedAt: string
}

type SavedPost = {
  id: string
  updated_at?: string
  updatedAt?: string
}

export function useArticleDraftSync({
  snapshot,
  onPostId,
  onUnauthorized,
}: SyncInput): {
  status: ArticleDraftSyncStatus
  lastSavedAt: string | null
  flush(published?: boolean): Promise<SaveResult>
  discardLocal(): void
  restoreLocal(): ArticleDraftSnapshot | null
} {
  const [status, setStatus] = useState<ArticleDraftSyncStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const latestRef = useRef(snapshot)
  const postIdRef = useRef(snapshot.postId)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlightRef = useRef<Promise<SaveResult> | null>(null)

  const onPostIdRef = useRef(onPostId)
  const onUnauthorizedRef = useRef(onUnauthorized)
  const lastSavedAtRef = useRef<string | null>(null)
  latestRef.current = snapshot
  if (snapshot.postId) postIdRef.current = snapshot.postId

  onPostIdRef.current = onPostId
  onUnauthorizedRef.current = onUnauthorized
  const saveSnapshot = useCallback((draft: ArticleDraftSnapshot, nextPublished: boolean) => {
    if (inFlightRef.current) return inFlightRef.current

    const postId = postIdRef.current
    setStatus('server-saving')
    const request = fetch(postId ? `/api/admin/posts/${postId}` : '/api/admin/posts', {
      method: postId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: draft.title,
        slug: draft.slug,
        excerpt: draft.excerpt,
        content: draft.content,
        published: nextPublished,
        expectedUpdatedAt: lastSavedAtRef.current,
      }),
    })

    const operation = runAdminAction<SavedPost>(request, { onUnauthorized: () => onUnauthorizedRef.current() })
      .then((post) => {
        const updatedAt = post.updated_at ?? post.updatedAt ?? new Date().toISOString()
        if (!postIdRef.current) {
          removeDraft(draft.postId, draft.clientId)
          postIdRef.current = post.id
          onPostIdRef.current(post.id)
        }
        writeDraft({ ...draft, postId: post.id, published: nextPublished, updatedAt })
        setLastSavedAt(updatedAt)
        lastSavedAtRef.current = updatedAt
        setStatus('server-saved')
        return { postId: post.id, updatedAt }
      })
      .catch((error) => {
        setStatus('error')
        throw error
      })
      .finally(() => {
        if (inFlightRef.current === operation) inFlightRef.current = null
      })

    inFlightRef.current = operation
    return operation
  }, [])

  const flush = useCallback((nextPublished = false) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const current = latestRef.current
    if (!current.title.trim()) return Promise.reject(new Error('标题不能为空'))
    return saveSnapshot(current, nextPublished)
  }, [saveSnapshot])

  const snapshotSignature = JSON.stringify(snapshot)

  useEffect(() => {
    const current = latestRef.current
    const local = readDraft(current.postId, current.clientId)
    const contentChanged = local
      && (
        local.title !== current.title
        || local.slug !== current.slug
        || local.excerpt !== current.excerpt
        || local.content !== current.content
        || local.published !== current.published
      )

    if (local && contentChanged && compareDrafts(local, current) === 'local-newer') {
      setStatus('conflict')
      return
    }

    writeDraft(current)
    setStatus('local-saved')

    if (timerRef.current) clearTimeout(timerRef.current)
    if (current.title.trim()) {
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        void saveSnapshot(latestRef.current, false).catch(() => undefined)
      }, 1500)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [saveSnapshot, snapshotSignature])

  const discardLocal = useCallback(() => {
    const current = latestRef.current
    removeDraft(current.postId, current.clientId)
    if (postIdRef.current !== current.postId) removeDraft(postIdRef.current, current.clientId)
    setStatus('idle')
  }, [])

  const restoreLocal = useCallback(() => {
    const current = latestRef.current
    return readDraft(current.postId, current.clientId)
  }, [])

  return { status, lastSavedAt, flush, discardLocal, restoreLocal }
}
