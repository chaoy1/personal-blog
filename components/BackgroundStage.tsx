'use client'

import { useEffect, useState } from 'react'
import QianliAmbient from './QianliAmbient'
import MapleLeaves from './MapleLeaves'
import StarryNight from './StarryNight'
import useAmbientMotion from './useAmbientMotion'

export default function BackgroundStage() {
  // Keep the server and hydration render identical. The head script and root-theme
  // CSS paint the stored theme immediately; this state only selects ambient layers
  // after React has mounted.
  const [dark, setDark] = useState(false)
  const active = useAmbientMotion() === true

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
      {dark ? (
        <>
          <StarryNight active={active} />
          <MapleLeaves active={active} night />
        </>
      ) : (
        <>
          <QianliAmbient active={active} />
          <MapleLeaves active={active} />
        </>
      )}
    </>
  )
}
