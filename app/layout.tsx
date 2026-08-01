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
                <stop offset="1" stopColor="#eee7d4" />
              </linearGradient>
              <radialGradient id="moonHalo">
                <stop offset="0" stopColor="#e9dbb8" stopOpacity="0.9" />
                <stop offset="1" stopColor="#e9dbb8" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="m1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#e2dcc7" stopOpacity="0.95" />
                <stop offset="1" stopColor="#e9e3d0" stopOpacity="0.55" />
              </linearGradient>
              <linearGradient id="m2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#d2cbb1" stopOpacity="0.95" />
                <stop offset="1" stopColor="#ddd6bf" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id="m3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#beb694" stopOpacity="0.9" />
                <stop offset="1" stopColor="#ccc4a7" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id="m4" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#a59c7b" stopOpacity="0.88" />
                <stop offset="1" stopColor="#b9b091" stopOpacity="0.48" />
              </linearGradient>
              <linearGradient id="m5" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#8b8263" stopOpacity="0.86" />
                <stop offset="1" stopColor="#a09678" stopOpacity="0.5" />
              </linearGradient>
              <filter id="brushA" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="4" seed="7" result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="22" xChannelSelector="R" yChannelSelector="G" />
              </filter>
              <filter id="brushB" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.02 0.05" numOctaves="3" seed="3" result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="13" xChannelSelector="R" yChannelSelector="G" />
              </filter>
              <filter id="mist" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="26" />
              </filter>
              <filter id="mistSoft" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="44" />
              </filter>
            </defs>

            <rect width="1600" height="900" fill="url(#bgSky)" />

            <circle cx="1220" cy="168" r="170" fill="url(#moonHalo)" filter="url(#mistSoft)" />
            <circle cx="1220" cy="168" r="48" fill="#e9dcba" opacity="0.82" />
            <path
              d="M1148 146 q 58 14 118 4 q 40 -8 84 0"
              stroke="#d8d0b6"
              strokeWidth="10"
              opacity="0.55"
              fill="none"
              strokeLinecap="round"
              filter="url(#mist)"
            />

            <path
              d="M0 520 C 180 430, 260 380, 420 460 C 560 520, 660 420, 820 470 C 980 520, 1120 420, 1300 490 C 1420 530, 1520 470, 1600 500 L 1600 900 L 0 900 Z"
              fill="url(#m1)"
              opacity="0.9"
              filter="url(#brushB)"
            />
            <path
              d="M0 590 C 200 500, 340 460, 520 550 C 700 630, 820 480, 1000 540 C 1160 590, 1300 500, 1600 560 L 1600 900 L 0 900 Z"
              fill="url(#m2)"
              opacity="0.95"
              filter="url(#brushB)"
            />
            <path
              d="M0 660 C 240 560, 420 540, 600 630 C 780 710, 940 560, 1120 620 C 1280 670, 1420 600, 1600 640 L 1600 900 L 0 900 Z"
              fill="url(#m3)"
              filter="url(#brushA)"
            />
            <path
              d="M0 730 C 260 640, 480 630, 680 700 C 900 780, 1080 640, 1260 690 C 1420 730, 1520 680, 1600 710 L 1600 900 L 0 900 Z"
              fill="url(#m4)"
              filter="url(#brushA)"
            />
            <path
              d="M0 800 C 300 730, 560 720, 780 780 C 1000 840, 1180 730, 1360 770 C 1480 795, 1550 760, 1600 780 L 1600 900 L 0 900 Z"
              fill="url(#m5)"
              filter="url(#brushA)"
            />

            <g fill="#7d7457" opacity="0.5">
              <circle cx="520" cy="560" r="5" />
              <circle cx="540" cy="555" r="3.5" />
              <circle cx="512" cy="570" r="3" />
              <circle cx="980" cy="560" r="6" />
              <circle cx="1000" cy="550" r="4" />
              <circle cx="966" cy="575" r="3" />
              <circle cx="700" cy="720" r="5" />
              <circle cx="690" cy="735" r="3.5" />
              <circle cx="1230" cy="705" r="6" />
              <circle cx="1250" cy="690" r="4" />
              <circle cx="1216" cy="715" r="3" />
            </g>

            <ellipse cx="380" cy="620" rx="400" ry="55" fill="#f3eee1" opacity="0.7" filter="url(#mist)" />
            <ellipse cx="1180" cy="700" rx="440" ry="60" fill="#f1ecdd" opacity="0.65" filter="url(#mist)" />
            <ellipse cx="760" cy="780" rx="540" ry="66" fill="#efe9d9" opacity="0.55" filter="url(#mistSoft)" />

            <g stroke="#8a8573" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5">
              <path d="M1030 300 q 14 -12 30 -2 q 14 -10 30 0" />
              <path d="M1100 352 q 11 -9 24 -2 q 11 -8 24 0" />
              <path d="M965 385 q 10 -8 22 -2 q 10 -7 22 0" />
            </g>

            <rect x="0" y="830" width="1600" height="70" fill="#d9d3bc" opacity="0.32" />
            <g stroke="#8a8573" strokeWidth="2" opacity="0.35" strokeLinecap="round" fill="none">
              <path d="M200 852 q 30 0 60 0" />
              <path d="M420 862 q 34 0 68 0" />
              <path d="M900 848 q 30 0 60 0" />
              <path d="M1230 866 q 34 0 68 0" />
            </g>
            <g opacity="0.55">
              <path d="M360 846 q 30 13 62 0 q -30 8 -62 0 Z" fill="#4a473d" />
              <path d="M391 844 v -26" stroke="#4a473d" strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M391 828 l 14 -4" stroke="#4a473d" strokeWidth="3" strokeLinecap="round" fill="none" />
            </g>

            <g stroke="#4a473d" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.42">
              <path d="M-10 330 C 60 290, 130 278, 210 264" />
              <path d="M60 306 C 88 268, 100 236, 96 198" />
              <path d="M140 284 C 150 246, 146 216, 132 180" />
            </g>
            <g stroke="#4a473d" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.42">
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
              style={
                {
                  left: leaf.left,
                  '--d': leaf.d,
                  '--delay': leaf.delay,
                  '--sway': leaf.sway,
                  '--size': `${leaf.size}px`,
                  '--color': leaf.color,
                } as CSSProperties
              }
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
