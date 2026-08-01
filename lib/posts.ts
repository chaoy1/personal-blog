import { isSupabaseConfigured, supabaseAdmin } from './supabase'
import { makeSlug, isValidSlug } from './slug'
import type { Post, PostInput } from './blog'

export { formatDate, readingTime } from './blog'
export type { Post, PostInput } from './blog'

const FIELDS = 'id,title,slug,excerpt,content,published,created_at,updated_at'

// 未配置 Supabase 时返回演示文章，方便本地预览界面样式；配置后自动失效
const DEMO_POSTS: Post[] = [
  {
    id: 'demo-1',
    title: '开篇：把文字安放在自己的屋檐下',
    slug: 'hello-world',
    excerpt: '第一篇文字，说说这个博客的来由，以及写作这件事本身。',
    content: `在别处的屋檐下住了很久之后，终于想给自己盖一间小屋。

## 为什么要有自己的地方

写作这件事，最怕的是"写了就丢了"。散落在各种平台里的文字，随着时间、账号和平台的变动，慢慢就找不回来了。

> 属于自己的地方，哪怕再小，也是一种从容。

## 这里会写什么

- 读书与观影的笔记
- 技术上的踩坑记录
- 一些没头没尾的随想

## 关于更新

这里不追求日更，只希望每篇文字都值得被反复读一遍。与其写得快，不如写得久。

如果有一天这里只剩下一篇文章，我希望它是这篇——因为所有故事，都是从"开始"讲起的。`,
    published: true,
    created_at: '2026-07-20T08:00:00Z',
    updated_at: '2026-07-20T08:00:00Z',
  },
  {
    id: 'demo-2',
    title: '从零搭一个免费博客：Next.js 与 Supabase 的组合',
    slug: 'build-a-free-blog',
    excerpt: '不买服务器、不申请公网 IP，十分钟让博客上线，还自带管理后台。',
    content: `这篇记录这个博客本身的搭建方式。目标很简单：免费、可控、能随时更新。

## 技术栈

| 层 | 选择 | 原因 |
|---|---|---|
| 前端 | Next.js | 页面即组件，部署到 Vercel 免费 |
| 数据库 | Supabase | 免费 PostgreSQL，自带后台 |
| 部署 | Vercel | 推 GitHub 自动构建，免运维 |

## 数据怎么存

文章存在一张 \`posts\` 表里，字段包括标题、slug、摘要、Markdown 正文和发布状态：

\`\`\`sql
create table posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  content text not null default '',
  published boolean not null default true
);
\`\`\`

## 更新流程

打开后台，登录，写一篇 Markdown，点发布——前台立刻就出现了。不需要碰服务器，也不需要重新部署。

唯一要注意的是：**管理密码和数据库密钥要放在环境变量里**，不要写进代码。`,
    published: true,
    created_at: '2026-07-25T08:00:00Z',
    updated_at: '2026-07-25T08:00:00Z',
  },
  {
    id: 'demo-3',
    title: '写点什么，比写得完美更重要',
    slug: 'write-something',
    excerpt: '完美是动笔之后慢慢逼近的，不是动笔之前等来的。',
    content: `很多想写字的人，卡在同一个地方：觉得还没准备好。

## 准备的幻觉

我们总以为写作需要完整的心得、成熟的观点、漂亮的开头。于是每次打开文档，又默默关掉。

> 纸上只有一行字，也好过心里有一万行字。

## 一个可行的办法

降低门槛：先写给自己看，再决定要不要给别人看。草稿箱就是为此存在的。

1. 想到什么记什么，不整理
2. 攒够一段，才考虑结构
3. 发布前只删减，不重写

就这样，这个博客的第一篇，也是用这个办法写出来的。`,
    published: true,
    created_at: '2026-07-30T08:00:00Z',
    updated_at: '2026-07-30T08:00:00Z',
  },
]

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
  if (!isSupabaseConfigured()) return DEMO_POSTS
  const { data, error } = await supabaseAdmin()
    .from('posts')
    .select(FIELDS)
    .eq('published', true)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`读取文章失败：${error.message}`)
  return data ?? []
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  if (!isSupabaseConfigured()) {
    return DEMO_POSTS.find((p) => p.slug === slug) ?? null
  }
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
  if (!isSupabaseConfigured()) return DEMO_POSTS
  const { data, error } = await supabaseAdmin()
    .from('posts')
    .select(FIELDS)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`读取文章失败：${error.message}`)
  return data ?? []
}

export async function getPostById(id: string): Promise<Post | null> {
  if (!isSupabaseConfigured()) {
    return DEMO_POSTS.find((p) => p.id === id) ?? null
  }
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
