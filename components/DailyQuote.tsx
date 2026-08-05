'use client'

import { useState } from 'react'
import { QUOTES, dailyQuote } from '@/lib/quotes'

export default function DailyQuote() {
  const [quote, setQuote] = useState(() => dailyQuote())

  function shuffle() {
    if (QUOTES.length <= 1) return
    let next = quote
    while (next === quote) {
      next = QUOTES[Math.floor(Math.random() * QUOTES.length)]
    }
    setQuote(next)
  }

  return (
    <aside className="daily-quote" aria-label="每日一句">
      <span className="dq-seal" aria-hidden="true">
        句
      </span>
      <p className="dq-text">“{quote.text}”</p>
      <span className="dq-source">— {quote.source}</span>
      <button
        type="button"
        className="dq-shuffle"
        onClick={shuffle}
        title="换一句"
        aria-label="随机换一句"
      >
        ⟳
      </button>
    </aside>
  )
}
