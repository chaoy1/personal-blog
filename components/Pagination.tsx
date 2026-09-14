import Button from '@/components/Button'

export type PaginationProps = {
  page: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
  previousLabel?: string
  nextLabel?: string
  summary?: string
}

export default function Pagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
  previousLabel = '← 上一页',
  nextLabel = '下一页 →',
  summary,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const pageCount = Math.max(1, Math.floor(totalPages))
  const safePage = Math.min(Math.max(Math.floor(page) || 1, 1), pageCount)
  const emitPage = (nextPage: number) => {
    onPageChange(Math.min(Math.max(Math.floor(nextPage) || 1, 1), pageCount))
  }

  return (
    <nav className="pager" aria-label="分页">
      <Button
        variant="ghost"
        type="button"
        disabled={safePage <= 1}
        onClick={() => emitPage(safePage - 1)}
      >
        {previousLabel}
      </Button>
      <span className="pager-info">
        {summary ?? `第 ${safePage} / ${pageCount} 页 · 共 ${totalItems} 条`}
      </span>
      <Button
        variant="ghost"
        type="button"
        disabled={safePage >= pageCount}
        onClick={() => emitPage(safePage + 1)}
      >
        {nextLabel}
      </Button>
    </nav>
  )
}
