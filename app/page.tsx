import Link from 'next/link'
import type { Metadata } from 'next'
import { listPublishedPosts, countPosts, type Post } from '@/lib/posts'
import { SITE_DESC } from '@/lib/site'
import { isSupabaseConfigured } from '@/lib/supabase'
import { listAllMoments, listRecentAlbumPreviews, countMoments, countPhotos, type TimelineMoment, type HomeAlbumPreview } from '@/lib/timeline'
import { listRecentGuestbook, type GuestbookRow } from '@/lib/guestbook'
import ScrollFX from '@/components/ScrollFX'
import HomeHero from '@/components/home/HomeHero'
import HomePreviews from '@/components/home/HomePreviews'
import { publicMetadata } from '@/lib/seo'
import './home.css'
import './home-hero-scroll.css'
import './home-content-cards.css'

export const revalidate = 60

export const metadata: Metadata = publicMetadata({
  path: '/',
  description: SITE_DESC,
})

export default async function HomePage() {
  let posts: Post[] = []
  let moments: TimelineMoment[] = []
  let albums: HomeAlbumPreview[] = []
  let postCount = 0
  let momentCount = 0
  let photoCount = 0
  let recentGuestbook: GuestbookRow[] = []

  // 首页各区块互不依赖，并行读取可避免一个慢查询拖住整张画卷。
  const [postsResult, postCountResult, momentsResult, momentCountResult, albumsResult, photoCountResult, guestbookResult] =
    await Promise.allSettled([
      listPublishedPosts(3),
      countPosts(),
      listAllMoments(3),
      countMoments(),
      listRecentAlbumPreviews(3),
      countPhotos(),
      listRecentGuestbook(3),
    ])

  if (postsResult.status === 'fulfilled') posts = postsResult.value
  postCount = postCountResult.status === 'fulfilled' ? postCountResult.value : posts.length
  if (momentsResult.status === 'fulfilled') moments = momentsResult.value
  momentCount = momentCountResult.status === 'fulfilled' ? momentCountResult.value : moments.length
  if (albumsResult.status === 'fulfilled') albums = albumsResult.value
  photoCount = photoCountResult.status === 'fulfilled' ? photoCountResult.value : albums.reduce((count, album) => count + album.photoCount, 0)
  if (guestbookResult.status === 'fulfilled') recentGuestbook = guestbookResult.value

  const notConfigured = !isSupabaseConfigured()
  const resourceErrors = {
    posts: postsResult.status === 'rejected' ? '文章暂时未能载入。' : undefined,
    moments: momentsResult.status === 'rejected' ? '闲语暂时未能载入。' : undefined,
    photos: albumsResult.status === 'rejected' ? '光影暂时未能载入。' : undefined,
    guestbook: guestbookResult.status === 'rejected' ? '留言暂时未能载入。' : undefined,
  }

  return (
    <main className="wrap home-page">
      <ScrollFX />
      <HomeHero postCount={postCount} momentCount={momentCount} photoCount={photoCount} />

      {notConfigured && process.env.NODE_ENV !== 'production' ? (
        <div className="setup-hint">
          <strong>数据库还没配置好。</strong>完成下面两步即可看到文章：
          <br />
          1. 在 Supabase 控制台 SQL Editor 里运行 <code>supabase/schema.sql</code> 建表；
          <br />
          2. 把 <code>.env.local</code> 里的 Supabase 三项配置填好，然后重启 <code>npm run dev</code>。
        </div>
      ) : null}

      <HomePreviews posts={posts} moments={moments} albums={albums} guestbook={recentGuestbook} errors={resourceErrors} />

      <footer className="home-footer">
        <div className="footer-line">
          言有尽 · 意无穷 · <Link href="/admin">管理</Link>
        </div>
        <span className="footer-seal" aria-hidden="true">
          墨
        </span>
      </footer>
    </main>
  )
}
