'use client'

import { useEffect, useState } from 'react'

type Heading = { id: string; text: string; level: number }

function headingId(text: string, index: number) {
  const normalized = text
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}\u4e00-\u9fff]+/gu, '-')
    .replace(/^-|-$/g, '')
  return normalized || `section-${index + 1}`
}

export default function ReadingCompanion() {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState('')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const article = document.querySelector<HTMLElement>('.article-reading-shell .article')
    const body = article?.querySelector<HTMLElement>('.md-body')
    if (!article || !body) return

    const used = new Set<string>()
    const elements = Array.from(body.querySelectorAll<HTMLElement>('h2, h3'))
    const items = elements.map((element, index) => {
      const base = element.id || headingId(element.textContent || '', index)
      let id = base
      let suffix = 2
      while (used.has(id)) id = `${base}-${suffix++}`
      used.add(id)
      element.id = id
      return { id, text: element.textContent?.trim() || `第 ${index + 1} 节`, level: Number(element.tagName[1]) }
    })
    setHeadings(items)

    let frame = 0
    const update = () => {
      const top = article.offsetTop
      const distance = Math.max(1, article.offsetHeight - window.innerHeight * 0.55)
      setProgress(Math.max(0, Math.min(1, (window.scrollY - top + 130) / distance)))

      let current = items[0]?.id || ''
      for (const element of elements) {
        if (element.getBoundingClientRect().top <= 170) current = element.id
        else break
      }
      setActiveId(current)
      frame = 0
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      <div className="reading-progress" aria-hidden="true">
        <i style={{ transform: `scaleX(${progress})` }} />
      </div>
      {headings.length > 0 ? (
        <div className="reading-companion-rail">
          <aside className="reading-companion" aria-label="文章目录">
            <span className="rc-eyebrow">卷内路径</span>
            <nav>
              {headings.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={`${heading.level === 3 ? 'sub ' : ''}${activeId === heading.id ? 'active' : ''}`}
                >
                  <i aria-hidden="true" />
                  {heading.text}
                </a>
              ))}
            </nav>
            <span className="rc-percent">已读 {Math.round(progress * 100)}%</span>
          </aside>
        </div>
      ) : null}
    </>
  )
}
