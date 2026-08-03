'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useBackground } from './BackgroundProvider'
import { PAINTINGS } from './paintings'
import QianliAmbient from './QianliAmbient'
import LanternAmbient from './LanternAmbient'

export default function BackgroundStage() {
  const { bg } = useBackground()
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const sync = () => setDark(root.dataset.theme === 'dark')
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])

  const painting = PAINTINGS[bg]

  return (
    <>
      <div
        className={`bg-painting${dark ? ' night' : ''}`}
        aria-hidden="true"
        style={
          {
            backgroundImage: `url(${painting.src})`,
            backgroundPosition: painting.pos,
          } as CSSProperties
        }
      />
      {dark ? <div className="bg-tint" aria-hidden="true" /> : <div className="bg-blend" aria-hidden="true" />}
      {dark ? <LanternAmbient /> : <QianliAmbient />}
    </>
  )
}
