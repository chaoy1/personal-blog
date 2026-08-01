import { supabaseAdmin } from './supabase'
import { makeSlug, isValidSlug } from './slug'
import type { Post, PostInput } from './blog'

export { formatDate, readingTime } from './blog'
export type { Post, PostInput } from './blog'

const FIELDS = 'id,title,slug,excerpt,content,published,created_at,updated_at'

function normalizeInput(
  input: PostInput
): Required<Pick<Post, 'title' | 'slug' | 'excerpt' | 'content' | 'published'>> {
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title) throw new Error('标题不能为空')

  const slug =
    typeof input.slug === 'string' && input.slug.trim()
      ? input.slug.trim()
      : makeSlug(title)
  if (!isValidSlug(slug)) {
    throw new Error('slug 只能包含字母、数字和连字符')
  }

  const excerpt = typeof input.excerpt === 'string' ? input.excerpt.trim() : ''
  const content = typeof input.content === 'string' ? input.content : ''
  const published = input.published !== false

  return { title, slug, excerpt, content, published }
}

export async function listPublishedPosts(): Promise<Post[]> {
  const { data, error } = await supabaseAdmin()
    .from('posts')
    .select(FIELDS)
    .eq('published', true)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`读取文章失败：${error.message}`)
  return data ?? []
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const { data, error } = await supabaseAdmin()
    .from('posts')
    .select(FIELDS)
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()
  if (error) throw new Error(`读取文章失败：${error.message}`)
  return data
}

export async function listAllPosts(): Promise<Post[]> {
  const { data, error } = await supabaseAdmin()
    .from('posts')
    .select(FIELDS)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`读取文章失败：${error.message}`)
  return data ?? []
}

export async function getPostById(id: string): Promise<Post | null> {
  const { data, error } = await supabaseAdmin()
    .from('posts')
    .select(FIELDS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`读取文章失败：${error.message}`)
  return data
}

export async function createPost(input: PostInput): Promise<Post> {
  const values = normalizeInput(input)
  const { data, error } = await supabaseAdmin()
    .from('posts')
    .insert(values)
    .select(FIELDS)
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('slug 已存在，请换一个')
    throw new Error(`创建文章失败：${error.message}`)
  }
  return data
}

export async function updatePost(id: string, input: PostInput): Promise<Post> {
  const values = normalizeInput(input)
  const { data, error } = await supabaseAdmin()
    .from('posts')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(FIELDS)
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('slug 已存在，请换一个')
    throw new Error(`更新文章失败：${error.message}`)
  }
  return data
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from('posts').delete().eq('id', id)
  if (error) throw new Error(`删除文章失败：${error.message}`)
}
