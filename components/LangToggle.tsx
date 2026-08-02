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

  function pick(next: 'zh-Hans' | 'zh-Hant') {
    setLang(next)
    setLanguage(next).catch(() => {})
  }

  return (
    <div className="lang-switch" role="group" aria-label="简体 / 繁体切换">
      <button
        type="button"
        className={lang === 'zh-Hans' ? 'on' : ''}
        onClick={() => pick('zh-Hans')}
        title="切换到简体"
      >
        简
      </button>
      <button
        type="button"
        className={lang === 'zh-Hant' ? 'on' : ''}
        onClick={() => pick('zh-Hant')}
        title="切换到繁体"
      >
        繁
      </button>
    </div>
  )
}
