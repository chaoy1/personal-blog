import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/admin-route'
import { listAllPosts, createPost } from '@/lib/posts'

export const GET = withAdmin(async (req: NextRequest) => {
  try {
    const posts = await listAllPosts({ trashed: req.nextUrl.searchParams.get('trash') === '1' })
    return NextResponse.json(posts)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '读取失败' },
      { status: 500 }
    )
  }
})

export const POST = withAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const post = await createPost(body)
    return NextResponse.json(post, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '创建失败' },
      { status: 400 }
    )
  }
})
