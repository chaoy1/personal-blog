'use client'

import { isValidElement, type HTMLAttributes, type ReactElement, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6
type MarkdownHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  children?: ReactNode
  node?: { position?: { start?: { line?: number } } } | null
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

/** 行内标记还原成纯文字，让标题 id 与最终渲染出来的文字一致。 */
function headingTextFromSource(raw: string) {
  return raw
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim()
}

/**
 * 先扫一遍源文，按出现顺序给每个标题算好 id，并记在它所在的行号上。
 * id 只由内容决定，不依赖渲染次数：StrictMode 重跑渲染、服务端预渲染与客户端注水
 * 会得到同一份结果，标题锚点也因此保持一致。
 */
function collectHeadingIds(source: string): Map<number, string> {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const counts = new Map<string, number>()
  const byLine = new Map<number, string>()
  let fence: string | null = null

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    // 代码块里的 # 不是标题。
    const fenceMark = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (fence) {
      if (fenceMark && fenceMark[1].startsWith(fence)) fence = null
      continue
    }
    if (fenceMark) {
      fence = fenceMark[1]
      continue
    }

    const heading = line.match(/^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/)
    if (!heading) continue

    const base = headingSlug(headingTextFromSource(heading[1]), byLine.size)
    const count = (counts.get(base) ?? 0) + 1
    counts.set(base, count)
    byLine.set(index + 1, count === 1 ? base : `${base}-${count}`)
  }

  return byLine
}

function createHeadingRenderer(
  level: HeadingLevel,
  headingIds: Map<number, string>,
  takenIds: Set<string>,
) {
  return function MarkdownHeading({ children, node, ...props }: MarkdownHeadingProps) {
    const line = node?.position?.start?.line
    const scanned = line ? headingIds.get(line) : undefined
    // 兜底：源文里扫不到的标题（setext、HTML 块等）也要拿到一个稳定的 id。
    const base = scanned ?? headingSlug(textFromChildren(children), 0)
    const id = scanned || !takenIds.has(base) ? base : `${base}-${line ?? 'section'}`
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
  const source = preserveParagraphs ? keepProseParagraphs(content) : content
  const headingIds = collectHeadingIds(source)
  const takenIds = new Set(headingIds.values())

  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: createHeadingRenderer(1, headingIds, takenIds),
          h2: createHeadingRenderer(2, headingIds, takenIds),
          h3: createHeadingRenderer(3, headingIds, takenIds),
          h4: createHeadingRenderer(4, headingIds, takenIds),
          h5: createHeadingRenderer(5, headingIds, takenIds),
          h6: createHeadingRenderer(6, headingIds, takenIds),
          table: ({ children, ...props }) => (
            <div className="md-table-wrap" role="region" aria-label="文章表格，可横向滚动" tabIndex={0}>
              <table {...props}>{children}</table>
            </div>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
