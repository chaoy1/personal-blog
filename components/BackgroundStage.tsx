'use client'

import { useEffect, useState } from 'react'
import QianliAmbient from './QianliAmbient'
import MapleLeaves from './MapleLeaves'
import StarryNight from './StarryNight'

export default function BackgroundStage() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const sync = () => setDark(root.dataset.theme === 'dark')
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])

  return (
    <>
      <div className={`bg-painting${dark ? ' night' : ''}`} aria-hidden="true" />
      {dark ? <div className="bg-tint" aria-hidden="true" /> : <div className="bg-blend" aria-hidden="true" />}
      {dark ? <StarryNight /> : (
        <>
          <QianliAmbient />
          <MapleLeaves />
        </>
      )}
    </>
  )
}
