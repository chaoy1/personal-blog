'use client'

import { useState, type CSSProperties } from 'react'
import { QUOTES, dailyQuote } from '@/lib/quotes'

export default function DailyQuote() {
  const [quote, setQuote] = useState(() => dailyQuote())
  const [orbitTurns, setOrbitTurns] = useState(0)

  function shuffle() {
    if (QUOTES.length <= 1) return
    setQuote((currentQuote) => {
      let next = currentQuote
      while (next === currentQuote) {
        next = QUOTES[Math.floor(Math.random() * QUOTES.length)]
      }
      return next
    })
    setOrbitTurns((turns) => turns + 1)
  }

  return (
    <aside className="daily-quote" aria-label="每日一句">
      <span className="dq-seal" aria-hidden="true">
        句
      </span>
      <p className="dq-text">{quote.text}</p>
      <span className="dq-source">{quote.source}</span>
      <button
        type="button"
        className="dq-shuffle"
        onClick={shuffle}
        title="换一句"
        aria-label="随机换一句"
      >
        <svg
          className="dq-orbit"
          viewBox="0 0 52 52"
          aria-hidden="true"
          style={{ '--dq-turns': orbitTurns } as CSSProperties}
        >
          <path
            className="dq-orbit-track"
            d="M7 29C6 18 14 9 26 7C37 6 46 14 45 25C45 36 38 44 27 45C17 46 9 40 7 33"
          />
          <circle className="dq-orbit-dot" cx="39.5" cy="10.5" r="2.2" />
        </svg>
        <span className="dq-shuffle-label" aria-hidden="true">
          换
        </span>
      </button>
    </aside>
  )
}
