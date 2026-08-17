import type { Post } from '@/lib/posts'
import { SITE_NAME } from '@/lib/site'

export type ArticlePost = Post & { image?: string }

export type ArticleSchema = {
  '@context': 'https://schema.org'
  '@type': 'Article'
  headline: string
  description?: string
  mainEntityOfPage: string
  url: string
  datePublished: string
  dateModified: string
  author: { '@type': 'Organization'; name: string }
  publisher: { '@type': 'Organization'; name: string }
  image?: string
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')
}

export function absoluteUrl(path: string, baseUrl = siteUrl()): string {
  return new URL(path, `${baseUrl.replace(/\/+$/, '')}/`).toString()
}

export function articleJsonLd(post: ArticlePost, baseUrl = siteUrl()): ArticleSchema {
  const canonicalUrl = absoluteUrl(`/posts/${encodeURIComponent(post.slug)}`, baseUrl)

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    ...(post.excerpt ? { description: post.excerpt } : {}),
    mainEntityOfPage: canonicalUrl,
    url: canonicalUrl,
    datePublished: post.created_at,
    dateModified: post.updated_at,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME },
    ...(post.image ? { image: post.image } : {}),
  }
}
