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
    const body = document.querySelector<HTMLElement>('.article-wrap .md-body, .article-reading-shell .md-body')
    const article = body?.closest<HTMLElement>('.art-sheet, .article') ?? null
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

  const percent = Math.round(progress * 100)

  return (
    <>
      <div
        className="reading-progress"
        role="progressbar"
        aria-label="阅读进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`已读 ${percent}%`}
      >
        <i aria-hidden="true" style={{ transform: `scaleX(${progress})` }} />
      </div>
      {headings.length > 0 ? (
        <>
          <div className="reading-companion-rail">
            <aside className="reading-companion" aria-label="阅读批注">
              <span className="rc-eyebrow">CONTENTS / 目录</span>
              <p className="rc-title">卷内路径</p>
              <nav aria-label="文章目录">
                {headings.map((heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className={`${heading.level === 3 ? 'sub ' : ''}${activeId === heading.id ? 'active' : ''}`}
                    aria-current={activeId === heading.id ? 'location' : undefined}
                  >
                    <i aria-hidden="true" />
                    {heading.text}
                  </a>
                ))}
              </nav>
              <div className="rc-progress">
                <span>已读</span>
                <strong>{percent}%</strong>
              </div>
              <div className="rc-track" aria-hidden="true">
                <span style={{ transform: `scaleX(${progress})` }} />
              </div>
              <p className="rc-aside">
                写得慢一点，
                <br />
                也算是在往前走。
              </p>
            </aside>
          </div>
          <details className="reading-companion-compact">
            <summary>
              <span>卷内目录</span>
              <span aria-hidden="true">已读 {percent}%</span>
            </summary>
            <nav aria-label="移动文章目录">
              {headings.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={heading.level === 3 ? 'sub' : undefined}
                  aria-current={activeId === heading.id ? 'location' : undefined}
                >
                  {heading.text}
                </a>
              ))}
            </nav>
          </details>
        </>
      ) : null}
    </>
  )
}
