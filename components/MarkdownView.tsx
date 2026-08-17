'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function keepProseParagraphs(content: string) {
  return content
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/([^\n])\n(?=[^\n])/g, '$1\n\n')
}

export default function MarkdownView({
  content,
  preserveParagraphs = false,
}: {
  content: string
  preserveParagraphs?: boolean
}) {
  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children, ...props }) => (
            <div className="md-table-wrap" role="region" aria-label="文章表格，可横向滚动" tabIndex={0}>
              <table {...props}>{children}</table>
            </div>
          ),
        }}
      >
        {preserveParagraphs ? keepProseParagraphs(content) : content}
      </ReactMarkdown>
    </div>
  )
}
