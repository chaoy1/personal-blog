import type { MetadataRoute } from 'next'
import { listPublishedPosts } from '@/lib/posts'
import { absoluteUrl, siteUrl } from '@/lib/seo'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteUrl()
  const routes = ['', '/posts', '/moments', '/album', '/timeline', '/guestbook', '/about']
  let posts = [] as Awaited<ReturnType<typeof listPublishedPosts>>

  try {
    posts = await listPublishedPosts()
  } catch {
    // The static public routes remain discoverable when content is unavailable.
  }

  return [
    ...routes.map((route) => ({
      url: absoluteUrl(route || '/', baseUrl),
      lastModified: new Date(),
    })),
    ...posts.map((post) => ({
      url: absoluteUrl(`/posts/${encodeURIComponent(post.slug)}`, baseUrl),
      lastModified: new Date(post.updated_at || post.created_at),
    })),
  ]
}
