import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { SITE_NAME, SITE_DESC } from '@/lib/site'

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} · ${SITE_DESC}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESC,
}

export const viewport: Viewport = {
  themeColor: '#f5f2e9',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <filter id="ink" x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="n" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="n"
              scale="5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>
        <div className="vignette" aria-hidden="true" />
        <div className="specks" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <div className="mountains" aria-hidden="true">
          <svg viewBox="0 0 1440 236" preserveAspectRatio="xMidYMax slice">
            <path
              className="m-far"
              d="M0 184 L120 98 L210 152 L330 54 L440 140 L560 86 L690 152 L800 68 L930 144 L1040 92 L1180 162 L1300 112 L1440 172 L1440 236 L0 236 Z"
            />
            <path
              className="m-near"
              d="M0 214 L140 152 L260 198 L400 134 L530 202 L660 154 L790 206 L920 152 L1060 208 L1200 170 L1320 212 L1440 184 L1440 236 L0 236 Z"
            />
          </svg>
        </div>
        <div className="mist m1" aria-hidden="true" />
        <div className="mist m2" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  )
}
