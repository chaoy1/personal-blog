import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin'
import { getPostById, updatePost, deletePost } from '@/lib/posts'

type Ctx = {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  const { id } = await params
  const post = await getPostById(id)
  if (!post) return NextResponse.json({ error: '文章不存在' }, { status: 404 })
  return NextResponse.json(post)
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await req.json()
    const post = await updatePost(id, body)
    return NextResponse.json(post)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '更新失败' },
      { status: 400 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  const { id } = await params
  await deletePost(id)
  return NextResponse.json({ ok: true })
}
