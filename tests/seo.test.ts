import { expect, test } from 'vitest'

import { articleJsonLd } from '@/lib/seo'

test('creates article structured data with a canonical URL and no empty image field', () => {
  const schema = articleJsonLd(
    {
      id: 'post-1',
      title: '山河入梦',
      slug: 'mountains-in-dreams',
      excerpt: '一篇手记。',
      content: '正文',
      published: true,
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-02T00:00:00.000Z',
    },
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
