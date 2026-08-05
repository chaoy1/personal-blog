'use client'

import { useEffect, useState } from 'react'
import { currentLang } from '@/lib/lang'

const HANS = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾']
const HANT = ['壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖', '拾']

/** 文章序号大数字，跟随简繁切换 */
export default function CnNum({ i }: { i: number }) {
  const [lang, setLang] = useState<'zh-Hans' | 'zh-Hant'>('zh-Hans')

  useEffect(() => {
    const sync = () => setLang(currentLang())
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] })
    return () => mo.disconnect()
  }, [])

  const arr = lang === 'zh-Hant' ? HANT : HANS
  return <>{i < arr.length ? arr[i] : String(i + 1).padStart(2, '0')}</>
}
