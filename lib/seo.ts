import type { Metadata } from 'next'
import type { Post } from '@/lib/posts'
import { SITE_NAME } from '@/lib/site'

export type ArticlePost = Post & { image?: string }
export const DEFAULT_SHARE_IMAGE = '/bg/qianli-bridge.jpg'
const LOCAL_SITE_URL = 'http://localhost:3000'

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

export function normalizeSiteUrl(value?: string): string {
  const candidate = value?.trim()
  if (!candidate) return LOCAL_SITE_URL

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return LOCAL_SITE_URL
    return url.toString().replace(/\/+$/, '')
  } catch {
    return LOCAL_SITE_URL
  }
}

export function siteUrl(): string {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)
}

export function absoluteUrl(path: string, baseUrl = siteUrl()): string {
  return new URL(path, `${normalizeSiteUrl(baseUrl)}/`).toString()
}

export function publicMetadata(
  input: { path: string; title?: string; description: string },
  baseUrl = siteUrl()
): Metadata {
  const canonicalUrl = absoluteUrl(input.path, baseUrl)
  const shareImageUrl = absoluteUrl(DEFAULT_SHARE_IMAGE, baseUrl)

  return {
    ...(input.title ? { title: input.title } : {}),
    description: input.description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'website',
      url: canonicalUrl,
      title: input.title || SITE_NAME,
      description: input.description,
      siteName: SITE_NAME,
      locale: 'zh_CN',
      images: [{ url: shareImageUrl, alt: input.title || SITE_NAME }],
    },
  }
}

export function articleMetadata(post: ArticlePost, baseUrl = siteUrl()): Metadata {
  const canonicalUrl = absoluteUrl(`/posts/${encodeURIComponent(post.slug)}`, baseUrl)
  const description = post.excerpt || '一篇来自似水流年的手记。'

  return {
    title: post.title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'article',
      url: canonicalUrl,
      title: post.title,
      description,
      siteName: SITE_NAME,
      locale: 'zh_CN',
      images: [{ url: post.image || absoluteUrl(DEFAULT_SHARE_IMAGE, baseUrl), alt: post.title }],
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
    },
  }
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
