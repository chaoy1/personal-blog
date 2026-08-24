import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useAdminConfirm } from '@/components/admin/AdminConfirmDialog'

function ConfirmProbe({ onResult }: { onResult?: (result: boolean) => void }) {
  const { confirm, dialog } = useAdminConfirm()

  return (
    <>
      <button
        type="button"
        onClick={() => void confirm({
          title: '删除文章？',
          description: '此操作无法撤销。',
          confirmLabel: '确认删除',
        }).then(onResult)}
      >
        删除
      </button>
      {dialog}
    </>
  )
}

afterEach(cleanup)

describe('useAdminConfirm', () => {
  it('renders an accessible destructive dialog and focuses Cancel when opened', () => {
    render(<ConfirmProbe />)

    fireEvent.click(screen.getByRole('button', { name: '删除' }))

    const dialog = screen.getByRole('alertdialog', { name: '删除文章？' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByText('此操作无法撤销。')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: '确认删除' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: '取消' })).toHaveFocus()
  })

  it('traps Tab within the dialog and resolves false after Escape while restoring focus', async () => {
    let result: boolean | undefined
    render(<ConfirmProbe onResult={(value) => { result = value }} />)
    const trigger = screen.getByRole('button', { name: '删除' })
    trigger.focus()
    fireEvent.click(trigger)

    const dialog = screen.getByRole('alertdialog')
    const cancel = within(dialog).getByRole('button', { name: '取消' })
    const confirm = within(dialog).getByRole('button', { name: '确认删除' })

    confirm.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(cancel).toHaveFocus()

    cancel.focus()
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(confirm).toHaveFocus()

    fireEvent.keyDown(window, { key: 'Escape' })

    await Promise.resolve()
    expect(result).toBe(false)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('resolves true after confirming and restores focus to the trigger', async () => {
    let result: boolean | undefined

    function ResultProbe() {
      const { confirm, dialog } = useAdminConfirm()

      return (
        <>
          <button
            type="button"
            onClick={() => void confirm({
              title: '删除文章？',
              description: '此操作无法撤销。',
              confirmLabel: '确认删除',
            }).then((value) => {
              result = value
            })}
          >
            删除
          </button>
          {dialog}
        </>
      )
    }

    render(<ResultProbe />)
    const trigger = screen.getByRole('button', { name: '删除' })
    trigger.focus()
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: '确认删除' }))

    await Promise.resolve()
    expect(result).toBe(true)
    expect(trigger).toHaveFocus()
  })
})
