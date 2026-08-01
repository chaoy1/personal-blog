export type Post = {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  published: boolean
  created_at: string
  updated_at: string
}

export type PostInput = {
  title?: string
  slug?: string
  excerpt?: string
  content?: string
  published?: boolean
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

export function readingTime(content: string): string {
  const cjk = (content.match(/[\u4e00-\u9fff]/g) ?? []).length
  const words = (content.match(/[A-Za-z0-9]+/g) ?? []).length
  const minutes = Math.max(1, Math.round(cjk / 350 + words / 200))
  return `约 ${minutes} 分钟`
}
