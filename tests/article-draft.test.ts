import { beforeEach, describe, expect, it } from 'vitest'
import {
  compareDrafts,
  draftKey,
  readDraft,
  removeDraft,
  writeDraft,
  type ArticleDraftSnapshot,
} from '@/lib/article-draft'

const snapshot: ArticleDraftSnapshot = {
  version: 2,
  clientId: 'client-a',
  postId: null,
  title: '山中一日',
  slug: 'mountain-day',
  excerpt: '摘要',
  content: '正文',
  published: false,
  updatedAt: '2026-08-24T01:00:00.000Z',
}

beforeEach(() => localStorage.clear())

describe('article draft storage', () => {
  it('round-trips valid snapshots with a stable key', () => {
    expect(draftKey(null, 'client-a')).toBe('admin-article-draft-v2:new:client-a')
    writeDraft(snapshot)
    expect(readDraft(null, 'client-a')).toEqual(snapshot)
    removeDraft(null, 'client-a')
    expect(readDraft(null, 'client-a')).toBeNull()
  })

  it('removes corrupt and unsupported snapshots without throwing', () => {
    const key = draftKey(null, 'client-a')
    localStorage.setItem(key, '{broken')
    expect(readDraft(null, 'client-a')).toBeNull()
    expect(localStorage.getItem(key)).toBeNull()

    localStorage.setItem(key, JSON.stringify({ ...snapshot, version: 1 }))
    expect(readDraft(null, 'client-a')).toBeNull()
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('compares local and server timestamps', () => {
    expect(compareDrafts(snapshot, { ...snapshot, updatedAt: '2026-08-24T00:00:00.000Z' })).toBe('local-newer')
    expect(compareDrafts(snapshot, { ...snapshot, updatedAt: '2026-08-24T02:00:00.000Z' })).toBe('server-newer')
    expect(compareDrafts(snapshot, { ...snapshot })).toBe('same')
  })
})
