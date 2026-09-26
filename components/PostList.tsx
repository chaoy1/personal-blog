'use client'

import { useMemo, useState } from 'react'
import type { Post } from '@/lib/blog'
import CnNum from '@/components/CnNum'
import Pagination from '@/components/Pagination'
import ResourcePrefetchLink from '@/components/ResourcePrefetchLink'

const PAGE_SIZE = 10

/** 序数用正式汉字，第十一篇之后退回阿拉伯数字 */
const CLASSICAL = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾']

/** 干支：以 1984 甲子为基准，用于年份题头的「丙午 · 五篇」 */
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

const CN_DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九']

function classicalOrdinal(value: number): string {
  return value <= CLASSICAL.length ? CLASSICAL[value - 1] : `第 ${value}`
}

function ganzhi(year: number): string {
  const offset = (((year - 1984) % 60) + 60) % 60
  return STEMS[offset % 10] + BRANCHES[offset % 12]
}

/** 1–99 的汉字读法，用于「五篇」这类计数 */
function chineseCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return String(value)
  if (value < 10) return CN_DIGITS[value]
  const tens = Math.floor(value / 10)
  const ones = value % 10
  const tensPart = tens === 1 ? '十' : `${CN_DIGITS[tens]}十`
  return ones === 0 ? tensPart : `${tensPart}${CN_DIGITS[ones]}`
}

function postYear(post: Post): number {
  const year = new Date(post.created_at).getFullYear()
  return Number.isFinite(year) ? year : 0
}

function postDay(post: Post): string {
  const date = new Date(post.created_at)
  if (Number.isNaN(date.getTime())) return post.created_at.slice(0, 10)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}.${month}.${day}`
}

type Item = { post: Post; index: number }
type CatalogGroup = { year: number; translation: string; items: Item[] }

/**
 * 按年份分组，但分页仍按时间倒序切满一页。
 * 同一页里每个年份按出现顺序聚在一起，翻页不会漏掉某个年份，
 * 页面上的先后顺序依旧等于时间倒序。
 */
function groupByYear(posts: Post[], pagePosts: Post[], offset: number): CatalogGroup[] {
  const totals = new Map<number, number>()
  posts.forEach((post) => {
    const year = postYear(post)
    totals.set(year, (totals.get(year) ?? 0) + 1)
  })

  const groups = new Map<number, CatalogGroup>()
  pagePosts.forEach((post, i) => {
    const year = postYear(post)
    if (!groups.has(year)) {
      const total = totals.get(year) ?? 0
      groups.set(year, {
        year,
        translation: `${ganzhi(year)} · ${chineseCount(total)}篇`,
        items: [],
      })
    }
    groups.get(year)!.items.push({ post, index: offset + i })
  })

  return Array.from(groups.values())
}

function Entry({
  post,
  index,
}: {
  post: Post
  index: number
}) {
  const href = `/posts/${post.slug}`

  return (
    <li className="entry reveal" data-post-row="true">
      <div className="entry-number" aria-hidden="true">
        <strong>
          <CnNum i={index} />
        </strong>
        <i>文</i>
      </div>

      <div className="entry-body">
        <div className="entry-meta">
          <span>ARTICLE</span>
          <i className="meta-line" aria-hidden="true" />
          <span>第{classicalOrdinal(index + 1)}篇</span>
        </div>
        <h3 className="entry-title">
          <ResourcePrefetchLink
            href={href}
            resourceKey={`comments:${post.slug}`}
            intentPrefetch
          >
            {post.title}
          </ResourcePrefetchLink>
        </h3>
        {post.excerpt ? <p className="entry-excerpt">{post.excerpt}</p> : null}
      </div>

      <div className="entry-info">
        <time dateTime={post.created_at.slice(0, 10)}>{postDay(post)}</time>
        <ResourcePrefetchLink
          className="entry-link"
          href={href}
          resourceKey={`comments:${post.slug}`}
          intentPrefetch
          aria-label={`读此篇：${post.title}`}
        >
          读此篇 <span aria-hidden="true">→</span>
        </ResourcePrefetchLink>
      </div>
    </li>
  )
}

export default function PostList({ posts }: { posts: Post[] }) {
  const [page, setPage] = useState(1)
  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(() => new Set())

  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const offset = (safePage - 1) * PAGE_SIZE
  const pagePosts = useMemo(
    () => posts.slice(offset, offset + PAGE_SIZE),
    [posts, offset],
  )

  const groups = useMemo(
    () => groupByYear(posts, pagePosts, offset),
    [posts, pagePosts, offset],
  )

  const changePage = (nextPage: number) => {
    setPage(nextPage)
    setCollapsedYears(new Set())
  }

  return (
    <>
      <div className="catalog-heading" id="catalog">
        <div className="left">
          <h2>篇目</h2>
          <small>CONTENTS / 目录</small>
        </div>
        <div className="count">
          共收录 <b>{String(posts.length).padStart(2, '0')}</b> 篇
        </div>
      </div>

      <div className="catalog-intro">
        <span>沿年份翻阅，把留在纸上的日子重新读一遍。</span>
        <span>轻触年份，可收起篇目</span>
      </div>

      <div className="catalog-layout">
        <aside className="year-rail" aria-label="年份索引">
          <div className="rail-inner">
            <div className="rail-preface">
              <small>IN THIS VOLUME</small>
              <strong>循字而往</strong>
              <p>从近作启卷，沿年序读到旧时。</p>
            </div>
            <span className="rail-label">YEAR / 年序</span>
            <nav aria-label="本页年份">
              {groups.map((group) => (
                <a key={group.year} className="rail-link" href={`#year-${group.year}`}>
                  <strong>{group.year}</strong>
                  <small>{group.translation}</small>
                </a>
              ))}
            </nav>
            <small className="rail-foot" aria-hidden="true">年岁为序 · 文字作记</small>
          </div>
        </aside>

        <div className="catalog-years">
          {groups.map((group) => {
            const collapsed = collapsedYears.has(group.year)
            const listId = `posts-${group.year}`

            return (
              <section
                key={group.year}
                className="year-group"
                aria-labelledby={`year-${group.year}`}
              >
                <h2 className="year-heading" id={`year-${group.year}`}>
                  <button
                    className="year-toggle"
                    type="button"
                    aria-expanded={!collapsed}
                    aria-controls={listId}
                    onClick={() => setCollapsedYears((current) => {
                      const next = new Set(current)
                      if (next.has(group.year)) next.delete(group.year)
                      else next.add(group.year)
                      return next
                    })}
                  >
                    <span className="diamond" aria-hidden="true" />
                    <span className="year">{group.year}</span>
                    <span className="translation">{group.translation}</span>
                    <span className="rule" aria-hidden="true" />
                    <span className="fold">{collapsed ? '展开' : '收起'}</span>
                  </button>
                </h2>
                <ol
                  id={listId}
                  className="entries"
                  aria-label={`${group.year} 年文章目录`}
                  hidden={collapsed}
                  inert={collapsed}
                >
                  {group.items.map(({ post, index }) => (
                    <Entry key={post.id} post={post} index={index} />
                  ))}
                </ol>
              </section>
            )
          })}
        </div>
      </div>

      <div className="catalog-end" aria-hidden="true">
        <span>终</span>
      </div>

      <footer className="catalog-colophon">
        <span>{`${chineseCount(posts.length)}篇已收录 · 新篇将续写于此`}</span>
        <span className="signature">似水流年</span>
      </footer>

      <Pagination
        page={safePage}
        totalPages={totalPages}
        totalItems={posts.length}
        onPageChange={changePage}
        summary={`第 ${safePage} / ${totalPages} 页 · 共 ${posts.length} 篇`}
      />
    </>
  )
}
