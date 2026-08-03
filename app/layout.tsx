import type { Metadata, Viewport } from 'next'
import type { CSSProperties, ReactNode } from 'react'
import './globals.css'
import { SITE_NAME, SITE_DESC } from '@/lib/site'
import SiteNav from '@/components/SiteNav'
import InkScape from '@/components/InkScape'
import InkScapeFX from '@/components/InkScapeFX'
import InkCanvas from '@/components/InkCanvas'
import ScrollTop from '@/components/ScrollTop'
import Lightbox from '@/components/Lightbox'

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} · ${SITE_DESC}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESC,
  icons: { icon: '/icon.svg' },
}

export const viewport: Viewport = {
  themeColor: '#f2edde',
}

const PETALS = [
  { left: '6%', size: 15, d: '17s', delay: '-3s', sway: '5s', color: '#c8403a' },
  { left: '16%', size: 12, d: '20s', delay: '-11s', sway: '6s', color: '#d9534a' },
  { left: '28%', size: 16, d: '16s', delay: '-6s', sway: '5s', color: '#b73430' },
  { left: '37%', size: 13, d: '21s', delay: '-14s', sway: '6s', color: '#d04a40' },
  { left: '48%', size: 17, d: '15s', delay: '-1s', sway: '5s', color: '#bf3a33' },
  { left: '56%', size: 12, d: '19s', delay: '-9s', sway: '6s', color: '#c8403a' },
  { left: '64%', size: 15, d: '17s', delay: '-13s', sway: '5s', color: '#d9534a' },
  { left: '72%', size: 11, d: '22s', delay: '-5s', sway: '6s', color: '#b73430' },
  { left: '80%', size: 16, d: '14s', delay: '-2s', sway: '5s', color: '#d04a40' },
  { left: '88%', size: 13, d: '18s', delay: '-8s', sway: '6s', color: '#bf3a33' },
  { left: '94%', size: 15, d: '16s', delay: '-12s', sway: '5s', color: '#c8403a' },
  { left: '11%', size: 14, d: '18s', delay: '-7s', sway: '6s', color: '#d9534a' },
  { left: '33%', size: 11, d: '20s', delay: '-15s', sway: '5s', color: '#d04a40' },
  { left: '60%', size: 17, d: '15s', delay: '-4s', sway: '6s', color: '#b73430' },
  { left: '70%', size: 12, d: '21s', delay: '-10s', sway: '5s', color: '#bf3a33' },
  { left: '92%', size: 14, d: '17s', delay: '-6s', sway: '6s', color: '#d9534a' },
]

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=d?'dark':'light';var l=localStorage.getItem('lang');document.documentElement.dataset.lang=(l==='zh-Hant'||l==='zh-Hans')?l:'zh-Hans';}catch(e){document.documentElement.dataset.theme='light';document.documentElement.dataset.lang='zh-Hans';}})();`,
          }}
        />
      </head>
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

        <InkScape />
        <InkScapeFX />

        <div className="leaves" aria-hidden="true">
          {PETALS.map((petal, i) => (
            <span
              key={i}
              className="leaf"
              style={
                {
                  left: petal.left,
                  '--d': petal.d,
                  '--delay': petal.delay,
                  '--sway': petal.sway,
                  '--size': `${petal.size}px`,
                  '--color': petal.color,
                } as CSSProperties
              }
            >
              <svg viewBox="0 0 20 22" fill="none">
                <path
                  d="M10 2 C 16 6, 18 12, 15 17 C 13 20, 10 21, 10 21 C 10 21, 7 20, 5 17 C 2 12, 4 6, 10 2 Z"
                  fill="var(--color)"
                  opacity="0.92"
                />
                <path d="M10 2 C 10 8, 10 13, 10 19" stroke="#4a1510" strokeOpacity="0.45" strokeWidth="0.7" />
              </svg>
            </span>
          ))}
        </div>

        <div className="specks" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <div className="grain" aria-hidden="true" />
        <InkCanvas />
        <ScrollTop />
        <SiteNav />
        {children}
        <Lightbox />
      </body>
    </html>
  )
}
