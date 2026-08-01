import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase'

const BUCKETS = ['avatars', 'photos', 'moments']

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const form = await req.formData()
  const bucket = String(form.get('bucket') || '')
  const file = form.get('file')

  if (!BUCKETS.includes(bucket) || !(file instanceof File)) {
    return NextResponse.json({ error: '參數錯誤' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'png'
  const path = `admin/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabaseAdmin()
    .storage.from(bucket)
    .upload(path, file, { upsert: true, cacheControl: '3600' })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
  return NextResponse.json({ url })
}
