import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Button from '@/components/Button'
import EmptyState from '@/components/EmptyState'
import FormField from '@/components/FormField'
import InlineFeedback from '@/components/InlineFeedback'
import PostList from '@/components/PostList'

describe('foundation feedback components', () => {
  afterEach(cleanup)

  it('exposes a disabled loading button with a 44px hit-area contract', () => {
    render(
      <Button variant="danger" size="sm" loading loadingLabel="保存中…">
        删除
      </Button>,
    )

    const button = screen.getByRole('button', { name: '保存中…' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveClass('btn', 'btn-danger', 'btn-sm', 'button-hit-area')
    expect(button).toHaveAttribute('data-button-variant', 'danger')
    expect(button).toHaveAttribute('data-button-size', 'sm')
  })

  it('associates field description and error with its control', () => {
    render(
      <FormField label="标题" htmlFor="title" description="用于列表展示" error="标题不能为空">
        <input id="title" />
      </FormField>,
    )

    const input = screen.getByLabelText('标题')
    expect(input).toHaveAttribute('aria-describedby', 'title-description title-error')
    expect(screen.getByText('用于列表展示')).toHaveAttribute('id', 'title-description')
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'title-error')
  })

  it('maps feedback tones to live-region semantics', () => {
    const { rerender } = render(<InlineFeedback tone="success" message="已保存" />)
    expect(screen.getByRole('status')).toHaveTextContent('已保存')
    expect(screen.getByRole('status')).toHaveAttribute('data-feedback-tone', 'success')

    rerender(<InlineFeedback tone="error" message="保存失败" onRetry={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('保存失败')
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
  })

  it('renders an empty result with an optional next action', () => {
    const onClick = vi.fn()
    render(
      <EmptyState
        title="还没有文章"
        description="可以先写下第一篇。"
        action={<Button onClick={onClick}>去写作</Button>}
      />,
    )

    expect(screen.getByText('还没有文章')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '去写作' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('keeps PostList pagination labels while using the shared Button', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/PostList.tsx'), 'utf8')
    expect(source).toContain("import Button from '@/components/Button'")
    expect(source).toContain('← 上一页')
    expect(source).toContain('下一页 →')
  })
})
