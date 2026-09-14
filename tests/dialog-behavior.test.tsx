import React, { useRef, useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import ConfirmDialog, { useConfirmDialog } from '@/components/ConfirmDialog'
import { useDialogBehavior } from '@/components/DialogBehavior'

function BehaviorProbe() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const initialRef = useRef<HTMLButtonElement>(null)
  const { dialogRef, onKeyDown } = useDialogBehavior<HTMLDivElement>({
    open,
    onClose: () => setOpen(false),
    initialFocusRef: initialRef,
  })

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>打开</button>
      {open ? (
        <div ref={dialogRef} role="dialog" tabIndex={-1} onKeyDown={onKeyDown}>
          <button ref={initialRef} type="button">第一个</button>
          <button type="button">最后一个</button>
        </div>
      ) : null}
    </>
  )
}

function ConfirmProbe({ onResult }: { onResult: (result: boolean) => void }) {
  const { confirm, dialog } = useConfirmDialog()

  function ask() {
    void confirm({
      title: '确认删除？',
      description: '此操作无法撤销。',
      confirmLabel: '删除',
    }).then(onResult)
  }

  return (
    <>
      <button type="button" onClick={ask}>询问</button>
      {dialog}
    </>
  )
}

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

describe('shared dialog behavior', () => {
  it('enters focus, wraps Tab, handles Escape, and restores focus/scroll', async () => {
    render(<BehaviorProbe />)
    const trigger = screen.getByRole('button', { name: '打开' })
    trigger.focus()
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog')
    const first = within(dialog).getByRole('button', { name: '第一个' })
    const last = within(dialog).getByRole('button', { name: '最后一个' })
    await waitFor(() => expect(first).toHaveFocus())
    expect(document.body.style.overflow).toBe('hidden')

    last.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(first).toHaveFocus()
    first.focus()
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(document.body.style.overflow).toBe('')
    expect(trigger).toHaveFocus()
  })

  it('renders confirm semantics and resolves a cancelled promise', async () => {
    let result: boolean | undefined
    render(<ConfirmProbe onResult={(value) => { result = value }} />)
    fireEvent.click(screen.getByRole('button', { name: '询问' }))

    const dialog = screen.getByRole('alertdialog', { name: '确认删除？' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByText('此操作无法撤销。')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }))

    await waitFor(() => expect(result).toBe(false))
  })

  it('removes native browser confirmation from public delete flows', () => {
    expect(readFileSync(resolve(process.cwd(), 'app/moments/page.tsx'), 'utf8')).not.toContain('window.confirm')
    expect(readFileSync(resolve(process.cwd(), 'app/guestbook/page.tsx'), 'utf8')).not.toContain('window.confirm')
  })

  it('keeps the Phase 3 shared contracts discoverable at their boundaries', () => {
    expect(readFileSync(resolve(process.cwd(), 'components/DialogBehavior.tsx'), 'utf8')).toContain('useDialogBehavior')
    expect(readFileSync(resolve(process.cwd(), 'components/ConfirmDialog.tsx'), 'utf8')).toContain('role="alertdialog"')
    expect(readFileSync(resolve(process.cwd(), 'components/Pagination.tsx'), 'utf8')).toContain('className="pager"')
    expect(readFileSync(resolve(process.cwd(), 'app/moments/page.tsx'), 'utf8')).toContain('useConfirmDialog')
    expect(readFileSync(resolve(process.cwd(), 'app/guestbook/page.tsx'), 'utf8')).toContain('useConfirmDialog')
  })
})
