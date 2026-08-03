'use client'

import { useBackground } from './BackgroundProvider'

const OPTIONS = [
  { id: 'qianli', label: '江山·昼' },
  { id: 'lantern', label: '灯影·夜' },
  { id: 'ink', label: '水墨·原' },
] as const

export default function BackgroundSwitcher() {
  const { bg, setBg } = useBackground()
  return (
    <div className="bg-switch" role="group" aria-label="切换背景">
      <span className="bg-switch-label">背景</span>
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          className={bg === o.id ? 'on' : ''}
          onClick={() => setBg(o.id)}
          title={o.label}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
