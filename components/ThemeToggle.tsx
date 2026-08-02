'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [wash, setWash] = useState(0)

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      // ignore
    }
    setTheme(next)
    setWash((w) => w + 1)
  }

  const dark = theme === 'dark'

  return (
    <button
      type="button"
      className={`theme-switch${dark ? ' on' : ''}`}
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label="切换昼夜模式"
      title={dark ? '切换到白天' : '切换到黑夜'}
    >
      <span className="ts-track" aria-hidden="true">
        <i className="ts-star" style={{ left: '17%', top: '32%', animationDelay: '0s' }} />
        <i className="ts-star" style={{ left: '35%', top: '62%', animationDelay: '0.7s' }} />
        <i className="ts-star" style={{ left: '49%', top: '22%', animationDelay: '1.3s' }} />
      </span>
      <span className="ts-knob" aria-hidden="true">
        <span className="ts-sun">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
            <circle cx="12" cy="12" r="4.4" />
            <path d="M12 2.4v2.6M12 19v2.6M2.4 12H5M19 12h2.6M5.1 5.1l1.9 1.9M17 17l1.9 1.9M18.9 5.1L17 7M7 17l-1.9 1.9" />
          </svg>
        </span>
        <span className="ts-moon">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
            <path d="M20.6 13.1A8.8 8.8 0 1 1 10.9 3.4a7 7 0 0 0 9.7 9.7Z" />
          </svg>
        </span>
      </span>
      {wash > 0 ? <span key={wash} className="ts-wash" aria-hidden="true" /> : null}
    </button>
  )
}
