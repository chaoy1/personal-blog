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
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();`,
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

        <div className="ink-bg" aria-hidden="true">
          <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="bgSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: 'var(--bg-sky1)' }} />
                <stop offset="1" style={{ stopColor: 'var(--bg-sky2)' }} />
              </linearGradient>
              <radialGradient id="moonHalo">
                <stop offset="0" style={{ stopColor: 'var(--bg-halo)', stopOpacity: '0.55' }} />
                <stop offset="1" style={{ stopColor: 'var(--bg-halo)', stopOpacity: '0' }} />
              </radialGradient>
              <linearGradient id="mFarG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: 'var(--bg-far1)', stopOpacity: '0.85' }} />
                <stop offset="1" style={{ stopColor: 'var(--bg-far2)', stopOpacity: '0.5' }} />
              </linearGradient>
              <linearGradient id="mMidG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: 'var(--bg-mid1)' }} />
                <stop offset="1" style={{ stopColor: 'var(--bg-mid2)' }} />
              </linearGradient>
              <linearGradient id="mMainG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: 'var(--bg-main1)' }} />
                <stop offset="1" style={{ stopColor: 'var(--bg-main2)' }} />
              </linearGradient>
              <linearGradient id="mNearG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: 'var(--bg-near1)' }} />
                <stop offset="1" style={{ stopColor: 'var(--bg-near2)' }} />
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

            <circle cx="1210" cy="170" r="180" fill="url(#moonHalo)" filter="url(#mistSoft)" />
            <circle cx="1210" cy="170" r="42" style={{ fill: 'var(--bg-moon)' }} opacity="0.95" />
            <path
              d="M1138 148 q 56 14 116 4 q 38 -8 80 0"
              style={{ stroke: 'var(--bg-cloud)' }}
              strokeWidth="10"
              opacity="0.85"
              fill="none"
              strokeLinecap="round"
              filter="url(#mist)"
            />

            <path
              d="M0 540 Q 240 450 420 520 T 860 500 T 1300 520 L 1600 505 L 1600 900 L 0 900 Z"
              fill="url(#mFarG)"
              opacity="0.8"
              filter="url(#mist)"
            />
            <path
              d="M0 660 Q 150 530 320 610 T 620 640 L 620 900 L 0 900 Z"
              fill="url(#mMidG)"
              opacity="0.65"
            />
            <path
              d="M920 680 Q 1070 540 1240 615 T 1600 610 L 1600 900 L 920 900 Z"
              fill="url(#mMidG)"
              opacity="0.65"
            />
            <path
              d="M560 900 L 660 660 Q 720 560 800 480 L 950 290 L 1040 470 Q 1090 540 1130 610 L 1190 710 L 1330 900 Z"
              fill="url(#mMainG)"
              filter="url(#brushSm)"
            />
            <path d="M880 420 L 950 290 L 1010 400 Q 960 445 880 420 Z" style={{ fill: 'var(--bg-ridge)' }} opacity="0.5" />
            <g style={{ stroke: 'var(--bg-cun)' }} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.5">
              <path d="M980 430 q 8 44 2 92" />
              <path d="M1030 490 q 10 50 4 104" />
              <path d="M1085 565 q 8 40 3 82" />
              <path d="M740 600 q 10 40 4 84" />
              <path d="M820 510 q 8 36 3 74" />
            </g>
            <g>
              <path d="M880 460 L 866 660" style={{ stroke: 'var(--bg-waterfall)' }} strokeWidth="5" opacity="0.9" strokeLinecap="round" />
              <path d="M888 480 L 880 620" style={{ stroke: 'var(--bg-waterfall)' }} strokeWidth="2" opacity="0.7" strokeLinecap="round" />
            </g>

            <ellipse cx="520" cy="640" rx="520" ry="66" style={{ fill: 'var(--bg-mist1)' }} opacity="0.8" filter="url(#mist)" />
            <ellipse cx="1200" cy="700" rx="540" ry="76" style={{ fill: 'var(--bg-mist2)' }} opacity="0.8" filter="url(#mist)" />
            <ellipse cx="800" cy="800" rx="920" ry="120" style={{ fill: 'var(--bg-mist3)' }} opacity="0.85" filter="url(#mistSoft)" />

            <path
              d="M0 800 Q 130 730 260 770 Q 350 800 400 840 L 400 900 L 0 900 Z"
              fill="url(#mNearG)"
              filter="url(#brushSm)"
            />
            <g style={{ stroke: 'var(--bg-pine)' }} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.9">
              <path d="M150 770 C 142 726, 148 688, 158 648" />
              <path d="M150 720 q -34 -12 -66 -8" />
              <path d="M154 678 q 38 -14 68 -6" />
            </g>
            <g style={{ stroke: 'var(--bg-pine)' }} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.9">
              <path d="M84 712 l -20 4 M84 712 l -14 18 M84 712 l 2 24 M84 712 l 16 20 M84 712 l 26 8" />
              <path d="M222 672 l -20 4 M222 672 l -14 18 M222 672 l 2 24 M222 672 l 16 20 M222 672 l 26 8" />
              <path d="M158 648 l -18 6 M158 648 l -8 22 M158 648 l 8 22 M158 648 l 22 14" />
            </g>

            <rect x="0" y="842" width="1600" height="58" style={{ fill: 'var(--bg-water)' }} opacity="0.95" />
            <ellipse cx="360" cy="858" rx="90" ry="22" style={{ fill: 'var(--bg-blob)' }} opacity="0.25" filter="url(#mist)" />
            <ellipse cx="880" cy="866" rx="150" ry="26" style={{ fill: 'var(--bg-blob)' }} opacity="0.22" filter="url(#mist)" />
            <ellipse cx="1250" cy="852" rx="80" ry="18" style={{ fill: 'var(--bg-blob)' }} opacity="0.28" filter="url(#mist)" />
            <g style={{ stroke: 'var(--bg-swirl)' }} strokeWidth="3" opacity="0.35" fill="none" strokeLinecap="round">
              <path d="M330 856 q 20 -14 44 -4 q 18 8 38 -2" />
              <path d="M830 862 q 26 -16 56 -6 q 22 8 48 -4" />
              <path d="M1210 852 q 18 -12 40 -4 q 16 6 34 -2" />
            </g>
            <g style={{ stroke: 'var(--bg-ripple)' }} strokeWidth="2" opacity="0.35" strokeLinecap="round" fill="none">
              <path d="M180 860 q 30 0 60 0" />
              <path d="M420 872 q 34 0 68 0" />
              <path d="M940 856 q 30 0 60 0" />
              <path d="M1260 872 q 34 0 68 0" />
            </g>
            <g opacity="0.7">
              <path d="M330 866 q 26 12 56 0 q -28 8 -56 0 Z" style={{ fill: 'var(--bg-boat)' }} />
              <path d="M358 864 v -22" style={{ stroke: 'var(--bg-boat)' }} strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <path d="M358 850 l 12 -3" style={{ stroke: 'var(--bg-boat)' }} strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </g>

            <g style={{ stroke: 'var(--bg-bird)' }} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.45">
              <path d="M1040 300 q 13 -11 28 -2 q 13 -9 28 0" />
              <path d="M1108 348 q 10 -8 22 -2 q 10 -7 22 0" />
              <path d="M980 382 q 9 -7 20 -2 q 9 -6 20 0" />
            </g>

            <g style={{ stroke: 'var(--bg-reed)' }} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.55">
              <path d="M60 900 C 70 860, 66 830, 58 800 M76 900 C 84 864, 82 832, 76 806" />
              <path d="M150 900 C 146 872, 150 850, 160 828 M162 900 C 158 876, 162 856, 172 836" />
              <path d="M1420 900 C 1430 866, 1426 838, 1416 812 M1436 900 C 1444 870, 1442 842, 1434 818" />
            </g>
            <g style={{ fill: 'var(--bg-reed)' }} opacity="0.5">
              <circle cx="58" cy="800" r="3.5" />
              <circle cx="76" cy="806" r="3" />
              <circle cx="160" cy="828" r="3.5" />
              <circle cx="172" cy="836" r="3" />
              <circle cx="1416" cy="812" r="3.5" />
              <circle cx="1434" cy="818" r="3" />
            </g>

            <g style={{ fill: 'var(--bg-moss)' }} opacity="0.4">
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
        <SiteNav />
        {children}
      </body>
    </html>
  )
}
