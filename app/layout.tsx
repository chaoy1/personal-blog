import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@fontsource/fraunces/300.css'
import '@fontsource/fraunces/400.css'
import '@fontsource/fraunces/500.css'
import '@fontsource/fraunces/600.css'
import '@fontsource/fraunces/400-italic.css'
import '@fontsource/fraunces/500-italic.css'
import '@fontsource/fraunces/600-italic.css'
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
  themeColor: '#f4efe4',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  )
}
