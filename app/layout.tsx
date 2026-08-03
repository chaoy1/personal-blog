import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { SITE_NAME, SITE_DESC } from '@/lib/site'
import SiteNav from '@/components/SiteNav'
import ScrollTop from '@/components/ScrollTop'
import Lightbox from '@/components/Lightbox'
import { BackgroundProvider } from '@/components/BackgroundProvider'
import BackgroundStage from '@/components/BackgroundStage'
import BackgroundSwitcher from '@/components/BackgroundSwitcher'

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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=d?'dark':'light';var l=localStorage.getItem('lang');document.documentElement.dataset.lang=(l==='zh-Hant'||l==='zh-Hans')?l:'zh-Hans';var b=localStorage.getItem('bg');document.documentElement.dataset.bg=(b==='qianli'||b==='qingming'||b==='fuchun'||b==='zaochun'||b==='xishan')?b:'qianli';}catch(e){document.documentElement.dataset.theme='light';document.documentElement.dataset.lang='zh-Hans';document.documentElement.dataset.bg='qianli';}})();`,
          }}
        />
      </head>
      <body>
        <BackgroundProvider>
          <BackgroundStage />
          <div className="vignette" aria-hidden="true" />
          <div className="grain" aria-hidden="true" />
          <ScrollTop />
          <SiteNav />
          {children}
          <BackgroundSwitcher />
          <Lightbox />
        </BackgroundProvider>
      </body>
    </html>
  )
}
