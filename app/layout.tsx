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
  themeColor: '#251d10',
}

const LEAVES = [
  { left: '6%', size: 26, d: '17s', delay: '-3s', sway: '6s', color: '#c84b32' },
  { left: '16%', size: 18, d: '20s', delay: '-11s', sway: '5s', color: '#b63a24' },
  { left: '28%', size: 22, d: '16s', delay: '-6s', sway: '7s', color: '#d65a3a' },
  { left: '37%', size: 16, d: '21s', delay: '-14s', sway: '5s', color: '#c85a38' },
  { left: '48%', size: 24, d: '15s', delay: '-1s', sway: '6s', color: '#bd4430' },
  { left: '56%', size: 17, d: '19s', delay: '-9s', sway: '5s', color: '#b63a24' },
  { left: '64%', size: 21, d: '17s', delay: '-13s', sway: '7s', color: '#c84b32' },
  { left: '72%', size: 15, d: '22s', delay: '-5s', sway: '5s', color: '#d65a3a' },
  { left: '80%', size: 25, d: '14s', delay: '-2s', sway: '6s', color: '#a83a28' },
  { left: '88%', size: 18, d: '18s', delay: '-8s', sway: '5s', color: '#c85a38' },
  { left: '94%', size: 22, d: '16s', delay: '-12s', sway: '7s', color: '#bd4430' },
  { left: '11%', size: 20, d: '18s', delay: '-7s', sway: '6s', color: '#c84b32' },
  { left: '33%', size: 15, d: '20s', delay: '-15s', sway: '5s', color: '#d65a3a' },
  { left: '60%', size: 23, d: '15s', delay: '-4s', sway: '7s', color: '#b63a24' },
  { left: '70%', size: 16, d: '21s', delay: '-10s', sway: '5s', color: '#a83a28' },
  { left: '92%', size: 19, d: '17s', delay: '-6s', sway: '6s', color: '#c85a38' },
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
                <stop offset="0" stopColor="#241b0e" />
                <stop offset="1" stopColor="#302512" />
              </linearGradient>
              <radialGradient id="moonHalo">
                <stop offset="0" stopColor="#e8cf8d" stopOpacity="0.5" />
                <stop offset="1" stopColor="#e8cf8d" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="mFarG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#46391f" stopOpacity="0.75" />
                <stop offset="1" stopColor="#382d19" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="mMidG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#2f2514" />
                <stop offset="1" stopColor="#221a0d" />
              </linearGradient>
              <linearGradient id="mMainG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3a2f1a" />
                <stop offset="1" stopColor="#16100a" />
              </linearGradient>
              <linearGradient id="mNearG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#221a0e" />
                <stop offset="1" stopColor="#100b05" />
              </linearGradient>
              <filter id="mist" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="24" />
              </filter>
              <filter id="mistSoft" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="46" />
              </filter>
              <filter id="brushSm" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.03 0.05" numOctaves="2" seed="5" result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>

            <rect width="1600" height="900" fill="url(#bgSky)" />
            <ellipse cx="820" cy="560" rx="920" ry="240" fill="#4a3a1e" opacity="0.3" filter="url(#mistSoft)" />

            <circle cx="1210" cy="170" r="180" fill="url(#moonHalo)" filter="url(#mistSoft)" />
            <circle cx="1210" cy="170" r="44" fill="#e8cf8d" opacity="0.92" />
            <path
              d="M1138 148 q 56 14 116 4 q 38 -8 80 0"
              stroke="#3f3120"
              strokeWidth="11"
              opacity="0.75"
              fill="none"
              strokeLinecap="round"
              filter="url(#mist)"
            />

            <path
              d="M0 560 Q 260 470 430 535 T 900 520 T 1400 545 L 1600 540 L 1600 900 L 0 900 Z"
              fill="url(#mFarG)"
              opacity="0.7"
              filter="url(#mist)"
            />
            <path
              d="M0 660 Q 150 530 320 610 T 620 640 L 620 900 L 0 900 Z"
              fill="url(#mMidG)"
            />
            <path
              d="M920 680 Q 1070 540 1240 615 T 1600 610 L 1600 900 L 920 900 Z"
              fill="url(#mMidG)"
            />
            <path
              d="M620 900 L 700 660 Q 750 560 830 480 L 970 300 L 1060 470 Q 1100 530 1140 590 L 1200 690 L 1340 900 Z"
              fill="url(#mMainG)"
              filter="url(#brushSm)"
            />
            <path d="M900 420 L 970 300 L 1030 400 Q 985 445 900 420 Z" fill="#4a3c22" opacity="0.65" />
            <g stroke="#0f0a04" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.55">
              <path d="M1000 430 q 8 44 2 92" />
              <path d="M1050 490 q 10 50 4 104" />
              <path d="M1105 565 q 8 40 3 82" />
              <path d="M760 600 q 10 40 4 84" />
              <path d="M840 510 q 8 36 3 74" />
            </g>
            <g>
              <path d="M896 460 L 882 660" stroke="#e8d9a8" strokeWidth="5" opacity="0.5" strokeLinecap="round" />
              <path d="M904 480 L 896 620" stroke="#e8d9a8" strokeWidth="2" opacity="0.35" strokeLinecap="round" />
            </g>

            <ellipse cx="520" cy="640" rx="520" ry="66" fill="#3b2e1a" opacity="0.55" filter="url(#mist)" />
            <ellipse cx="1200" cy="700" rx="540" ry="76" fill="#332818" opacity="0.55" filter="url(#mist)" />
            <ellipse cx="800" cy="800" rx="920" ry="120" fill="#2c2112" opacity="0.6" filter="url(#mistSoft)" />

            <path
              d="M0 800 Q 130 730 260 770 Q 350 800 400 840 L 400 900 L 0 900 Z"
              fill="url(#mNearG)"
              filter="url(#brushSm)"
            />
            <g stroke="#0d0a04" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.9">
              <path d="M150 770 C 142 726, 148 688, 158 648" />
              <path d="M150 720 q -34 -12 -66 -8" />
              <path d="M154 678 q 38 -14 68 -6" />
            </g>
            <g stroke="#0d0a04" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.9">
              <path d="M84 712 l -20 4 M84 712 l -14 18 M84 712 l 2 24 M84 712 l 16 20 M84 712 l 26 8" />
              <path d="M222 672 l -20 4 M222 672 l -14 18 M222 672 l 2 24 M222 672 l 16 20 M222 672 l 26 8" />
              <path d="M158 648 l -18 6 M158 648 l -8 22 M158 648 l 8 22 M158 648 l 22 14" />
            </g>

            <rect x="0" y="842" width="1600" height="58" fill="#120d06" opacity="0.85" />
            <g stroke="#c9b47f" strokeWidth="2" opacity="0.28" strokeLinecap="round" fill="none">
              <path d="M180 860 q 30 0 60 0" />
              <path d="M420 872 q 34 0 68 0" />
              <path d="M940 856 q 30 0 60 0" />
              <path d="M1260 872 q 34 0 68 0" />
            </g>
            <g opacity="0.7">
              <path d="M330 866 q 26 12 56 0 q -28 8 -56 0 Z" fill="#0b0804" />
              <path d="M358 864 v -22" stroke="#0b0804" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <path d="M358 850 l 12 -3" stroke="#0b0804" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </g>

            <g stroke="#b39a64" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5">
              <path d="M1040 300 q 13 -11 28 -2 q 13 -9 28 0" />
              <path d="M1108 348 q 10 -8 22 -2 q 10 -7 22 0" />
              <path d="M980 382 q 9 -7 20 -2 q 9 -6 20 0" />
            </g>

            <g fill="#6a5a32" opacity="0.45">
              <circle cx="760" cy="560" r="4" />
              <circle cx="775" cy="552" r="2.8" />
              <circle cx="1075" cy="520" r="4.5" />
              <circle cx="1090" cy="510" r="3" />
              <circle cx="300" cy="800" r="4" />
              <circle cx="315" cy="790" r="2.8" />
              <circle cx="180" cy="820" r="3.5" />
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
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2 L 15 9 L 22 9 L 17 13 L 19 20 L 12 16 L 5 20 L 7 13 L 2 9 L 9 9 Z"
                  fill="var(--color)"
                  opacity="0.9"
                  stroke="var(--color)"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
                <path d="M12 2 L 12 16 M8 10 L 12 13 M16 10 L 12 13" stroke="#2b140c" strokeOpacity="0.55" strokeWidth="0.8" />
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
