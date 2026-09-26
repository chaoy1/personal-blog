import Link from 'next/link'

import Avatar from '@/components/Avatar'
import CnNum from '@/components/CnNum'
import EmptyState from '@/components/EmptyState'
import InlineFeedback from '@/components/InlineFeedback'
import ResourcePrefetchLink from '@/components/ResourcePrefetchLink'
import Section from '@/components/Section'
import type { GuestbookRow } from '@/lib/guestbook'
import { formatDate, type Post } from '@/lib/posts'
import type { HomeAlbumPreview, TimelineMoment } from '@/lib/timeline'

const CN_WM = ['壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖', '拾']
type HomePreviewKey = 'posts' | 'moments' | 'photos' | 'guestbook'

export type HomePreviewsProps = {
  posts: Post[]
  moments: TimelineMoment[]
  albums: HomeAlbumPreview[]
  guestbook: GuestbookRow[]
  errors?: Partial<Record<HomePreviewKey, string>>
}

function SectionTitle({ title, href }: { title: string; href: string }) {
  return <h2 className="section-title"><span>{title}</span><Link href={href} className="home-more-link" aria-label={`更多${title}`}><span className="nav-back-mark" aria-hidden="true" /><span className="article-nav-label">更多</span></Link></h2>
}

export default function HomePreviews({ posts, moments, albums, guestbook, errors = {} }: HomePreviewsProps) {
  const hasResourceError = Object.values(errors).some(Boolean)
  const isCompletelyEmpty = posts.length === 0 && moments.length === 0 && albums.length === 0 && guestbook.length === 0 && !hasResourceError

  if (isCompletelyEmpty) {
    return <EmptyState title="长卷尚待落墨" description="文章、闲语、光影与来信会依次在这里展开。" />
  }

  return (
    <>
      {posts.length > 0 || errors.posts ? (
        <Section as="section" space="loose" className="home-section" id="posts" data-home-section="posts">
          <SectionTitle title="文章" href="/posts" />
          {errors.posts ? <InlineFeedback tone="error" message={errors.posts} /> : null}
          {posts.length > 0 ? <div className="list">{posts.map((post, index) => (
            <ResourcePrefetchLink key={post.id} href={`/posts/${post.slug}`} resourceKey={`comments:${post.slug}`} intentPrefetch className="item home-post-card">
              <span className="hpc-index" aria-hidden="true"><b><CnNum i={index} /></b><i>文</i></span>
              <span className="wm" aria-hidden="true">{index < CN_WM.length ? CN_WM[index] : ''}</span>
              <div className="hpc-copy">
                <span className="hpc-meta"><span>长文 · ARTICLE</span><time dateTime={post.created_at}>{formatDate(post.created_at)}</time></span>
                <h3 className="post-title">{post.title}</h3>
                {post.excerpt ? <span className="ex">{post.excerpt}</span> : null}
                <span className="item-foot"><span className="hpc-note">收录于此间手记</span><span className="read">阅读全文</span></span>
              </div>
            </ResourcePrefetchLink>
          ))}</div> : null}
        </Section>
      ) : null}

      {moments.length > 0 || errors.moments ? (
        <Section as="section" space="loose" className="home-section reveal" id="moments" data-home-section="moments">
          <SectionTitle title="闲语" href="/moments" />
          {errors.moments ? <InlineFeedback tone="error" message={errors.moments} /> : null}
          {moments.length > 0 ? <div className="home-moments">{moments.map((moment, index) => (
            <Link key={moment.id} href="/moments" className={`hm-card${moment.images.length > 0 ? '' : ' no-image'}`} data-photo-count={Math.min(moment.images.length, 3)}>
              <span className="hm-index" aria-hidden="true"><b>{String(index + 1).padStart(2, '0')}</b><i>闲</i></span>
              <span className="hm-copy">
                <span className="hm-meta"><span>片刻 · MOMENT</span><time dateTime={moment.created_at}>{formatDate(moment.created_at)}</time></span>
                <span className="hm-text">{moment.content || '一张图，胜过千言。'}</span>
                <span className="hm-action">读这一则 <i aria-hidden="true">→</i></span>
              </span>
              {moment.images.length > 0 ? <span className={`hm-thumbs count-${Math.min(moment.images.length, 3)}`} aria-hidden="true">{moment.images.slice(0, 3).map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="" loading="lazy" />
              ))}</span> : null}
            </Link>
          ))}</div> : null}
        </Section>
      ) : null}

      {albums.length > 0 || errors.photos ? (
        <Section as="section" space="loose" className="home-section reveal" id="photos" data-home-section="photos">
          <SectionTitle title="光影" href="/album" />
          {errors.photos ? <InlineFeedback tone="error" message={errors.photos} /> : null}
          {albums.length > 0 ? <div className="home-albums">{albums.map((album, index) => {
            const shots = album.photos.length > 0 ? album.photos.slice(0, 3) : album.cover_url ? [{ id: `cover-${album.id}`, url: album.cover_url, caption: '' }] : []
            return <Link key={album.id} href="/album" className="home-album-card" data-photo-count={shots.length} aria-label={`查看相册：${album.title}，${album.photoCount} 张照片`}>
              <span className="home-album-info"><span className="home-album-kicker">最近相册 · ALBUM {String(index + 1).padStart(2, '0')}</span><span className="home-album-title">{album.title}</span><span className="home-album-meta">{formatDate(album.created_at)} · {album.photoCount} 张照片</span></span>
              {shots.length > 0 ? <span className="home-album-stage" aria-hidden="true">{shots.map((shot) => <span className="home-album-shot" key={shot.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shot.url} alt="" loading="lazy" />
              </span>)}</span> : <span className="home-album-empty" aria-hidden="true">尚待光影</span>}
              <span className="home-album-foot">打开相册 <i aria-hidden="true">→</i></span>
            </Link>
          })}</div> : null}
        </Section>
      ) : null}

      {guestbook.length > 0 || errors.guestbook ? (
        <Section as="section" space="loose" className="home-section reveal" id="guestbook" data-home-section="guestbook">
          <SectionTitle title="留言" href="/guestbook" />
          {errors.guestbook ? <InlineFeedback tone="error" message={errors.guestbook} /> : null}
          {guestbook.length > 0 ? <div className="home-guestbook">{guestbook.map((entry, index) => (
            <Link key={entry.id} href="/guestbook" className="hg-item">
              <span className="hg-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <Avatar className="hg-avatar" src={entry.profiles?.avatar_url} />
              <div className="hg-body">
                <span className="hg-kicker">来信 · NOTE</span>
                <p className="hg-text">{entry.content}</p>
                <div className="hg-head"><span className="hg-name">{entry.profiles?.nickname || '旅人'}</span><time className="hg-date" dateTime={entry.created_at}>{formatDate(entry.created_at)}</time></div>
              </div>
              <span className="hg-action" aria-hidden="true">↗</span>
            </Link>
          ))}</div> : null}
        </Section>
      ) : null}
    </>
  )
}
