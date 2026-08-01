import type { Metadata, Viewport } from 'next'
import type { CSSProperties, ReactNode } from 'react'
import './globals.css'
import { SITE_NAME, SITE_DESC } from '@/lib/site'
import SiteNav from '@/components/SiteNav'

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

const LEAVES = [
  { left: '78%', size: 22, d: '15s', delay: '-2s', sway: '5s', color: '#a98355' },
  { left: '64%', size: 16, d: '18s', delay: '-9s', sway: '6s', color: '#8f5f3c' },
  { left: '90%', size: 20, d: '14s', delay: '-5s', sway: '4s', color: '#a8322a' },
  { left: '72%', size: 15, d: '17s', delay: '-12s', sway: '5s', color: '#b08a5a' },
  { left: '84%', size: 24, d: '16s', delay: '-7s', sway: '7s', color: '#8a6b4a' },
  { left: '58%', size: 17, d: '19s', delay: '-14s', sway: '5s', color: '#a98355' },
  { left: '95%', size: 14, d: '13s', delay: '-1s', sway: '4s', color: '#a8322a' },
  { left: '68%', size: 21, d: '15s', delay: '-10s', sway: '6s', color: '#8f5f3c' },
  { left: '50%', size: 18, d: '18s', delay: '-4s', sway: '5s', color: '#b08a5a' },
  { left: '87%', size: 16, d: '16s', delay: '-13s', sway: '4s', color: '#a98355' },
  { left: '62%', size: 23, d: '14s', delay: '-6s', sway: '7s', color: '#8a6b4a' },
  { left: '76%', size: 15, d: '19s', delay: '-3s', sway: '5s', color: '#a8322a' },
]

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
        <div className="ink-bg" aria-hidden="true">
          <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="bgSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f4f0e4" />
                <stop offset="1" stopColor="#efe9d8" />
              </linearGradient>
              <linearGradient id="mFar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ded8c4" stopOpacity="0.85" />
                <stop offset="1" stopColor="#e6e0cc" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id="mMid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#cbc4ad" stopOpacity="0.8" />
                <stop offset="1" stopColor="#d8d1ba" stopOpacity="0.45" />
              </linearGradient>
              <linearGradient id="mNear" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#b7af95" stopOpacity="0.7" />
                <stop offset="1" stopColor="#c6bda1" stopOpacity="0.4" />
              </linearGradient>
              <radialGradient id="moonHalo">
                <stop offset="0" stopColor="#e9dbb8" stopOpacity="0.9" />
                <stop offset="1" stopColor="#e9dbb8" stopOpacity="0" />
              </radialGradient>
              <filter id="blurLg" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="28" />
              </filter>
              <filter id="blurMd" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="12" />
              </filter>
              <filter id="blurSm" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" />
              </filter>
            </defs>
            <rect width="1600" height="900" fill="url(#bgSky)" />
            <circle cx="1220" cy="170" r="160" fill="url(#moonHalo)" filter="url(#blurLg)" />
            <circle cx="1220" cy="170" r="50" fill="#e9dcba" opacity="0.8" />
            <path
              d="M0 570 Q 220 390 460 530 T 900 480 T 1300 550 L 1600 510 L 1600 900 L 0 900 Z"
              fill="url(#mFar)"
              filter="url(#blurSm)"
            />
            <path
              d="M0 650 Q 260 490 520 620 T 1000 580 T 1600 650 L 1600 900 L 0 900 Z"
              fill="url(#mMid)"
              filter="url(#blurSm)"
            />
            <path
              d="M0 740 Q 300 610 620 710 T 1200 670 L 1600 730 L 1600 900 L 0 900 Z"
              fill="url(#mNear)"
            />
            <ellipse cx="420" cy="610" rx="380" ry="58" fill="#f2ede0" opacity="0.65" filter="url(#blurLg)" />
            <ellipse cx="1150" cy="670" rx="420" ry="66" fill="#f0ebdd" opacity="0.6" filter="url(#blurLg)" />
            <ellipse cx="800" cy="880" rx="900" ry="150" fill="#d8d2bc" opacity="0.32" filter="url(#blurLg)" />
            <g stroke="#8a8573" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.55">
              <path d="M1030 300 q 14 -12 30 -2 q 14 -10 30 0" />
              <path d="M1100 352 q 11 -9 24 -2 q 11 -8 24 0" />
              <path d="M965 385 q 10 -8 22 -2 q 10 -7 22 0" />
            </g>
            <g stroke="#4a473d" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.4">
              <path d="M-10 330 C 60 290, 130 278, 210 264" />
              <path d="M60 306 C 88 268, 100 236, 96 198" />
              <path d="M140 284 C 150 246, 146 216, 132 180" />
            </g>
            <g stroke="#4a473d" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4">
              <path d="M96 198 l -26 8 M96 198 l -22 20 M96 198 l -2 28 M96 198 l 20 20 M96 198 l 30 6" />
              <path d="M132 180 l -24 12 M132 180 l -14 26 M132 180 l 6 28 M132 180 l 24 18 M132 180 l 30 2" />
              <path d="M210 264 l -26 6 M210 264 l -20 20 M210 264 l -2 26 M210 264 l 22 18 M210 264 l 28 4" />
            </g>
          </svg>
        </div>
        <div className="leaves" aria-hidden="true">
          {LEAVES.map((leaf, i) => (
            <span
              key={i}
              className="leaf"
              style={{
                left: leaf.left,
                '--d': leaf.d,
                '--delay': leaf.delay,
                '--sway': leaf.sway,
                '--size': `${leaf.size}px`,
                '--color': leaf.color,
              } as CSSProperties}
            >
              <svg viewBox="0 0 20 24" fill="none">
                <path
                  d="M10 2 C 16 6, 18 12, 14 18 C 12 21, 8 22, 5 19 C 2 16, 3 9, 10 2 Z"
                  fill="var(--color)"
                  opacity="0.75"
                />
                <path d="M10 2 L 10 21" stroke="var(--color)" strokeOpacity="0.35" strokeWidth="0.8" />
              </svg>
            </span>
          ))}
        </div>
        <div className="specks" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <div className="grain" aria-hidden="true" />
        <SiteNav />
        {children}
      </body>
    </html>
  )
}
