import { expect, test } from 'vitest'

import { absoluteUrl, articleJsonLd, articleMetadata, normalizeSiteUrl, publicMetadata } from '@/lib/seo'
import sitemap, { revalidate as sitemapRevalidate } from '@/app/sitemap'

const samplePost = {
  id: 'post-1',
  title: '山河入梦',
  slug: 'mountains-in-dreams',
  excerpt: '一篇手记。',
  content: '正文',
  published: true,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-02T00:00:00.000Z',
}

test('normalizes only valid http site URLs', () => {
  expect(normalizeSiteUrl('  https://example.com/blog/  ')).toBe('https://example.com/blog')
  expect(normalizeSiteUrl('ftp://example.com')).toBe('http://localhost:3000')
  expect(normalizeSiteUrl('not a url')).toBe('http://localhost:3000')
})

test('uses the configured public site URL for generated metadata', () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL
  process.env.NEXT_PUBLIC_SITE_URL = 'https://blog.example.com/'

  expect(absoluteUrl('/sitemap.xml')).toBe('https://blog.example.com/sitemap.xml')

  if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
  else process.env.NEXT_PUBLIC_SITE_URL = previous
})

test('preserves a configured path prefix when composing public URLs', () => {
  expect(absoluteUrl('/posts/hello-world', 'https://example.com/blog')).toBe(
    'https://example.com/blog/posts/hello-world'
  )

  const metadata = publicMetadata(
    { path: '/about', title: '关于', description: '认识这间小屋。' },
    'https://example.com/blog'
  )
  expect(metadata.alternates?.canonical).toBe('https://example.com/blog/about')
})

test('creates an absolute canonical and share image for a public page', () => {
  const metadata = publicMetadata(
    { path: '/about', title: '关于', description: '认识这间小屋。' },
    'https://example.com'
  )

  expect(metadata.alternates?.canonical).toBe('https://example.com/about')
  expect(metadata.openGraph).toMatchObject({
    type: 'website',
    url: 'https://example.com/about',
    title: '关于',
    images: [{ url: 'https://example.com/bg/qianli-bridge.jpg' }],
  })
})

test('creates article Open Graph metadata for the article canonical', () => {
  const metadata = articleMetadata(samplePost, 'https://example.com')

  expect(metadata.alternates?.canonical).toBe('https://example.com/posts/mountains-in-dreams')
  expect(metadata.openGraph).toMatchObject({
    type: 'article',
    url: 'https://example.com/posts/mountains-in-dreams',
    publishedTime: '2026-08-01T00:00:00.000Z',
    modifiedTime: '2026-08-02T00:00:00.000Z',
    images: [{ url: 'https://example.com/bg/qianli-bridge.jpg' }],
  })
})

test('revalidates the sitemap while leaving static public routes without false timestamps', async () => {
  const entries = await sitemap()
  const staticEntries = entries.filter((entry) =>
    ['/', '/posts', '/moments', '/album', '/timeline', '/guestbook', '/about'].some((path) =>
      entry.url.endsWith(path === '/' ? '/' : path)
    )
  )

  expect(sitemapRevalidate).toBe(60)
  expect(staticEntries).toHaveLength(7)
  expect(staticEntries.every((entry) => entry.lastModified === undefined)).toBe(true)
})

test('creates article structured data with a canonical URL and no empty image field', () => {
  const schema = articleJsonLd(
    samplePost,
    'https://example.com/'
  )

  expect(schema).toMatchObject({
    '@type': 'Article',
    headline: '山河入梦',
    mainEntityOfPage: 'https://example.com/posts/mountains-in-dreams',
    datePublished: '2026-08-01T00:00:00.000Z',
    dateModified: '2026-08-02T00:00:00.000Z',
  })
  expect(schema).not.toHaveProperty('image')
})

test('includes an image only when one is supplied', () => {
  const schema = articleJsonLd(
    {
      id: 'post-2',
      title: '有图文章',
      slug: 'illustrated-post',
      excerpt: '',
      content: '正文',
      published: true,
      created_at: '2026-08-03T00:00:00.000Z',
      updated_at: '2026-08-04T00:00:00.000Z',
      image: 'https://cdn.example.com/cover.jpg',
    },
    'https://example.com'
  )

  expect(schema.image).toBe('https://cdn.example.com/cover.jpg')
})

test('normalizes relative post images and excludes data URLs from share metadata', () => {
  const relativeImagePost = { ...samplePost, image: '/covers/mountains.jpg' }
  const articleMetadataWithImage = articleMetadata(relativeImagePost, 'https://example.com/blog')
  const schemaWithImage = articleJsonLd(relativeImagePost, 'https://example.com/blog')
  const dataImagePost = { ...samplePost, image: 'data:image/png;base64,abc' }

  expect(articleMetadataWithImage.openGraph).toMatchObject({
    images: [{ url: 'https://example.com/blog/covers/mountains.jpg' }],
  })
  expect(schemaWithImage.image).toBe('https://example.com/blog/covers/mountains.jpg')
  expect(articleJsonLd(dataImagePost, 'https://example.com/blog')).not.toHaveProperty('image')
  expect(articleMetadata(dataImagePost, 'https://example.com/blog').openGraph).toMatchObject({
    images: [{ url: 'https://example.com/blog/bg/qianli-bridge.jpg' }],
  })
})
