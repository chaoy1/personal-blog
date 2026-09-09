import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@fontsource/fraunces/600.css'
import '@fontsource/zhi-mang-xing/400.css'
import './globals.css'
import './refinement.css'
import './studio.css'
import { SITE_NAME, SITE_DESC } from '@/lib/site'
import SiteNav from '@/components/SiteNav'
import ScrollTop from '@/components/ScrollTop'
import Lightbox from '@/components/Lightbox'
import BackgroundStage from '@/components/BackgroundStage'
import { AppStoreProvider } from '@/lib/app-store'
import { DEFAULT_SHARE_IMAGE, absoluteUrl, siteUrl } from '@/lib/seo'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} · ${SITE_DESC}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESC,
  openGraph: {
    type: 'website',
    url: absoluteUrl('/'),
    title: SITE_NAME,
    description: SITE_DESC,
    siteName: SITE_NAME,
    locale: 'zh_CN',
    images: [{ url: absoluteUrl(DEFAULT_SHARE_IMAGE), alt: SITE_NAME }],
  },
  icons: { icon: '/icon.svg' },
}

export const viewport: Viewport = {
  themeColor: '#f2edde',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="preload" as="image" href="/bg/qianli-bridge.jpg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=d?'dark':'light';var l=localStorage.getItem('lang');document.documentElement.dataset.lang=(l==='zh-Hant'||l==='zh-Hans')?l:'zh-Hans';}catch(e){document.documentElement.dataset.theme='light';document.documentElement.dataset.lang='zh-Hans';}})();`,
          }}
        />
      </head>
      <body>
        <AppStoreProvider>
          <BackgroundStage />
          <div className="vignette" aria-hidden="true" />
          <div className="grain" aria-hidden="true" />
          <ScrollTop />
          <SiteNav />
          {children}
          <Lightbox />
        </AppStoreProvider>
      </body>
    </html>
  )
}
