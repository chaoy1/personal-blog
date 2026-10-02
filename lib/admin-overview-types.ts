import type { Post } from './blog'
export type DeskPost = Pick<Post, 'id' | 'title' | 'slug' | 'excerpt' | 'published' | 'updated_at'>
export type OverviewSource = 'articles' | 'moments' | 'photos' | 'albums' | 'profile'
export type AdminOverviewData = {
  articles: { total: number; published: number; draft: number; trash: number; recent: DeskPost[]; unfinished: DeskPost[] } | null
  moments: number | null
  photos: number | null
  albums: number | null
  profile: { nickname: string; avatar_url: string; bio: string } | null
  errors: Partial<Record<OverviewSource, string>>
  generatedAt: string
}
