'use client'

import { useBackground } from './BackgroundProvider'
import { PAINTINGS, type BgName } from './paintings'

export default function BackgroundSwitcher() {
  const { bg, setBg } = useBackground()
  return (
    <div className="bg-switch" role="group" aria-label="切换背景">
      <span className="bg-switch-label">名画</span>
      {(Object.keys(PAINTINGS) as BgName[]).map((id) => (
        <button
          key={id}
          type="button"
          className={bg === id ? 'on' : ''}
          onClick={() => setBg(id)}
          title={PAINTINGS[id].full}
        >
          {PAINTINGS[id].label}
        </button>
      ))}
    </div>
  )
}
