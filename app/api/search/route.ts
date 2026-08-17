import { NextResponse } from 'next/server'
import { listPublishedPosts } from '@/lib/posts'

export const revalidate = 60

export async function GET() {
  try {
    const posts = await listPublishedPosts()
    return NextResponse.json(
      posts.map((post) => ({
        title: post.title,
        excerpt: post.excerpt,
        slug: post.slug,
        createdAt: post.created_at,
      }))
    )
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
