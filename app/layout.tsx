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
  { left: '6%', size: 26, d: '17s', delay: '-3s', sway: '6s', color: '#e3b455', shape: 'maple' },
  { left: '16%', size: 18, d: '20s', delay: '-11s', sway: '5s', color: '#c0842c', shape: 'ginkgo' },
  { left: '28%', size: 22, d: '16s', delay: '-6s', sway: '7s', color: '#c0442c', shape: 'maple' },
  { left: '37%', size: 16, d: '21s', delay: '-14s', sway: '5s', color: '#e9c97a', shape: 'ginkgo' },
  { left: '48%', size: 24, d: '15s', delay: '-1s', sway: '6s', color: '#d19a3e', shape: 'maple' },
  { left: '56%', size: 17, d: '19s', delay: '-9s', sway: '5s', color: '#b4702e', shape: 'ginkgo' },
  { left: '64%', size: 21, d: '17s', delay: '-13s', sway: '7s', color: '#e3b455', shape: 'maple' },
  { left: '72%', size: 15, d: '22s', delay: '-5s', sway: '5s', color: '#c0442c', shape: 'ginkgo' },
  { left: '80%', size: 25, d: '14s', delay: '-2s', sway: '6s', color: '#e9c97a', shape: 'maple' },
  { left: '88%', size: 18, d: '18s', delay: '-8s', sway: '5s', color: '#d19a3e', shape: 'ginkgo' },
  { left: '94%', size: 22, d: '16s', delay: '-12s', sway: '7s', color: '#b4702e', shape: 'maple' },
  { left: '11%', size: 20, d: '18s', delay: '-7s', sway: '6s', color: '#c0842c', shape: 'ginkgo' },
  { left: '33%', size: 15, d: '20s', delay: '-15s', sway: '5s', color: '#e3b455', shape: 'ginkgo' },
  { left: '60%', size: 23, d: '15s', delay: '-4s', sway: '7s', color: '#c0442c', shape: 'maple' },
  { left: '70%', size: 16, d: '21s', delay: '-10s', sway: '5s', color: '#e9c97a', shape: 'ginkgo' },
  { left: '92%', size: 19, d: '17s', delay: '-6s', sway: '6s', color: '#d19a3e', shape: 'maple' },
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
                <stop offset="0" stopColor="#241b0f" />
                <stop offset="1" stopColor="#2e2313" />
              </linearGradient>
              <radialGradient id="moonHalo">
                <stop offset="0" stopColor="#e9cc7c" stopOpacity="0.55" />
                <stop offset="1" stopColor="#e9cc7c" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="m1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#5a4b2b" stopOpacity="0.9" />
                <stop offset="1" stopColor="#4a3c22" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id="m2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#49391f" stopOpacity="0.92" />
                <stop offset="1" stopColor="#3a2e18" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id="m3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#382c16" stopOpacity="0.92" />
                <stop offset="1" stopColor="#2b2110" stopOpacity="0.55" />
              </linearGradient>
              <linearGradient id="m4" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#28200e" stopOpacity="0.92" />
                <stop offset="1" stopColor="#1e1709" stopOpacity="0.55" />
              </linearGradient>
              <linearGradient id="m5" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#1c1509" stopOpacity="0.94" />
                <stop offset="1" stopColor="#130d05" stopOpacity="0.6" />
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
            <ellipse cx="800" cy="620" rx="900" ry="220" fill="#4a3a1e" opacity="0.32" filter="url(#mistSoft)" />

            <circle cx="1220" cy="168" r="190" fill="url(#moonHalo)" filter="url(#mistSoft)" />
            <circle cx="1220" cy="168" r="46" fill="#e9cc7c" opacity="0.9" />
            <path
              d="M1148 146 q 58 14 118 4 q 40 -8 84 0"
              stroke="#4a3b20"
              strokeWidth="12"
              opacity="0.7"
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

            <g fill="#6a5a32" opacity="0.5">
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

            <ellipse cx="380" cy="620" rx="400" ry="55" fill="#4a3a1e" opacity="0.6" filter="url(#mist)" />
            <ellipse cx="1180" cy="700" rx="440" ry="60" fill="#3f3120" opacity="0.6" filter="url(#mist)" />
            <ellipse cx="760" cy="780" rx="540" ry="66" fill="#3a2d1a" opacity="0.55" filter="url(#mistSoft)" />

            <g stroke="#b39a64" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5">
              <path d="M1030 300 q 14 -12 30 -2 q 14 -10 30 0" />
              <path d="M1100 352 q 11 -9 24 -2 q 11 -8 24 0" />
              <path d="M965 385 q 10 -8 22 -2 q 10 -7 22 0" />
            </g>

            <rect x="0" y="830" width="1600" height="70" fill="#171007" opacity="0.5" />
            <g stroke="#b39a64" strokeWidth="2" opacity="0.22" strokeLinecap="round" fill="none">
              <path d="M200 852 q 30 0 60 0" />
              <path d="M420 862 q 34 0 68 0" />
              <path d="M900 848 q 30 0 60 0" />
              <path d="M1230 866 q 34 0 68 0" />
            </g>
            <g opacity="0.6">
              <path d="M360 846 q 30 13 62 0 q -30 8 -62 0 Z" fill="#0f0a04" />
              <path d="M391 844 v -26" stroke="#0f0a04" strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M391 828 l 14 -4" stroke="#0f0a04" strokeWidth="3" strokeLinecap="round" fill="none" />
            </g>

            <g stroke="#0c0803" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.7">
              <path d="M-10 330 C 60 290, 130 278, 210 264" />
              <path d="M60 306 C 88 268, 100 236, 96 198" />
              <path d="M140 284 C 150 246, 146 216, 132 180" />
            </g>
            <g stroke="#0c0803" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7">
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
              {leaf.shape === 'maple' ? (
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2 L 15 9 L 22 9 L 17 13 L 19 20 L 12 16 L 5 20 L 7 13 L 2 9 L 9 9 Z"
                    fill="var(--color)"
                    opacity="0.85"
                    stroke="var(--color)"
                    strokeWidth="1"
                    strokeLinejoin="round"
                  />
                  <path d="M12 2 L 12 16 M8 10 L 12 13 M16 10 L 12 13" stroke="#1b1409" strokeOpacity="0.5" strokeWidth="0.8" />
                </svg>
              ) : (
                <svg viewBox="0 0 22 26" fill="none">
                  <path
                    d="M11 2 C 17 6, 18 13, 15 18 C 14 20, 12 22, 11 22 C 10 22, 8 20, 7 18 C 4 13, 5 6, 11 2 Z"
                    fill="var(--color)"
                    opacity="0.85"
                    stroke="var(--color)"
                    strokeWidth="1"
                    strokeLinejoin="round"
                  />
                  <path d="M11 2 L 11 21" stroke="#1b1409" strokeOpacity="0.5" strokeWidth="0.8" />
                </svg>
              )}
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
