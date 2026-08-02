'use client'

import { useEffect, useState } from 'react'
import { currentLang, setLanguage } from '@/lib/lang'

export default function LangToggle() {
  const [lang, setLang] = useState<'zh-Hans' | 'zh-Hant'>('zh-Hans')

  useEffect(() => {
    const initial = currentLang()
    setLang(initial)
    if (initial === 'zh-Hant') {
      setLanguage('zh-Hant').catch(() => {})
    }
  }, [])

  function toggle() {
    const next = lang === 'zh-Hans' ? 'zh-Hant' : 'zh-Hans'
    setLang(next)
    setLanguage(next).catch(() => {})
  }

  return (
    <button
      type="button"
      className="lang-toggle"
      onClick={toggle}
      aria-label={lang === 'zh-Hans' ? '切换到繁体' : '切换到简体'}
      title={lang === 'zh-Hans' ? '切换到繁体' : '切换到简体'}
    >
      {lang === 'zh-Hans' ? '繁' : '简'}
    </button>
  )
}
