'use client'

import { isValidElement, type HTMLAttributes, type ReactElement, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6
type MarkdownHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  children?: ReactNode
  node?: unknown
}

function keepProseParagraphs(content: string) {
  return content
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/([^\n])\n(?=[^\n])/g, '$1\n\n')
}

function textFromChildren(children: ReactNode): string {
  if (children == null || typeof children === 'boolean') return ''
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(textFromChildren).join('')
  if (isValidElement(children)) {
    const element = children as ReactElement<{ children?: ReactNode }>
    return textFromChildren(element.props.children)
  }
  return ''
}

function headingSlug(text: string, index: number) {
  const normalized = text
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}\u4e00-\u9fff]+/gu, '-')
    .replace(/^-|-$/g, '')
  return normalized || `section-${index + 1}`
}

function createHeadingRenderer(level: HeadingLevel, usedIds: Map<string, number>) {
  return function MarkdownHeading({ children, node: _node, ...props }: MarkdownHeadingProps) {
    const base = headingSlug(textFromChildren(children), usedIds.size)
    const count = (usedIds.get(base) ?? 0) + 1
    usedIds.set(base, count)
    const id = count === 1 ? base : `${base}-${count}`
    const Tag = `h${level}` as `h${HeadingLevel}`

    return (
      <Tag {...props} id={id}>
        {children}
      </Tag>
    )
  }
}

export default function MarkdownView({
  content,
  preserveParagraphs = false,
}: {
  content: string
  preserveParagraphs?: boolean
}) {
  const usedHeadingIds = new Map<string, number>()

  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: createHeadingRenderer(1, usedHeadingIds),
          h2: createHeadingRenderer(2, usedHeadingIds),
          h3: createHeadingRenderer(3, usedHeadingIds),
          h4: createHeadingRenderer(4, usedHeadingIds),
          h5: createHeadingRenderer(5, usedHeadingIds),
          h6: createHeadingRenderer(6, usedHeadingIds),
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
