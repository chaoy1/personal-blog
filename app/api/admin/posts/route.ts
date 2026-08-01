import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin'
import { listAllPosts, createPost } from '@/lib/posts'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  try {
    const posts = await listAllPosts()
    return NextResponse.json(posts)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '读取失败' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
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
}
