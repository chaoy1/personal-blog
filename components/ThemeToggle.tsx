'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

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
  }

  const dark = theme === 'dark'

  return (
    <button
      type="button"
      className={`theme-switch${dark ? ' on' : ''}`}
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label="切換晝夜模式"
      title={dark ? '切換到白天' : '切換到黑夜'}
    >
      <span className="ts-track" aria-hidden="true" />
      <span className="ts-knob" aria-hidden="true">
        <span className="ts-sun">☀</span>
        <span className="ts-moon">☾</span>
      </span>
    </button>
  )
}
