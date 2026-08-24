export type ArticleDraftSnapshot = {
  version: 2
  clientId: string
  postId: string | null
  title: string
  slug: string
  excerpt: string
  content: string
  published: boolean
  updatedAt: string
}

const PREFIX = 'admin-article-draft-v2:'

export function draftKey(postId: string | null, clientId: string): string {
  return `${PREFIX}${postId ?? 'new'}:${clientId}`
}

function getStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function isSnapshot(value: unknown): value is ArticleDraftSnapshot {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return item.version === 2
    && typeof item.clientId === 'string'
    && (typeof item.postId === 'string' || item.postId === null)
    && typeof item.title === 'string'
    && typeof item.slug === 'string'
    && typeof item.excerpt === 'string'
    && typeof item.content === 'string'
    && typeof item.published === 'boolean'
    && typeof item.updatedAt === 'string'
    && Number.isFinite(Date.parse(item.updatedAt))
}

export function readDraft(postId: string | null, clientId: string): ArticleDraftSnapshot | null {
  const storage = getStorage()
  if (!storage) return null
  const key = draftKey(postId, clientId)
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isSnapshot(parsed)) {
      storage.removeItem(key)
      return null
    }
    return parsed
  } catch {
    try {
      storage.removeItem(key)
    } catch {
      // Storage can become unavailable between operations.
    }
    return null
  }
}

export function writeDraft(snapshot: ArticleDraftSnapshot): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(draftKey(snapshot.postId, snapshot.clientId), JSON.stringify(snapshot))
  } catch {
    // Local backup is best-effort; server sync remains available.
  }
}

export function removeDraft(postId: string | null, clientId: string): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(draftKey(postId, clientId))
  } catch {
    // Ignore unavailable storage.
  }
}

export function compareDrafts(
  local: Pick<ArticleDraftSnapshot, 'updatedAt'>,
  server: Pick<ArticleDraftSnapshot, 'updatedAt'>,
): 'local-newer' | 'server-newer' | 'same' {
  const localTime = Date.parse(local.updatedAt)
  const serverTime = Date.parse(server.updatedAt)
  if (localTime > serverTime) return 'local-newer'
  if (serverTime > localTime) return 'server-newer'
  return 'same'
}
