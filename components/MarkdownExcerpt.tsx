'use client'

import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const inline = ({ children }: { children?: ReactNode }) => <>{children}</>
const separated = ({ children }: { children?: ReactNode }) => <>{children}{' '}</>

/** Summaries also occur inside links: keep inline emphasis, omit images and nested links. */
export default function MarkdownExcerpt({ content }: { content: string }) {
  return <span><ReactMarkdown skipHtml remarkPlugins={[remarkGfm]} components={{
    p: separated, h1: separated, h2: separated, h3: separated, h4: separated,
    h5: separated, h6: separated, a: inline, ul: inline, ol: inline, li: separated,
    blockquote: separated, pre: inline, table: inline, thead: inline, tbody: inline,
    tr: separated, th: separated, td: separated, img: () => null,
    input: () => null, hr: () => null, section: () => null,
  }}>{content}</ReactMarkdown></span>
}
