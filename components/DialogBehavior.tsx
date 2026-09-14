'use client'

import { useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react'

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export type DialogBehaviorOptions = {
  open: boolean
  onClose: () => void
  initialFocusRef?: RefObject<HTMLElement | null>
}

export type DialogBehaviorResult<T extends HTMLElement = HTMLElement> = {
  dialogRef: RefObject<T | null>
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void
}

export function useDialogBehavior<T extends HTMLElement = HTMLElement>({
  open,
  onClose,
  initialFocusRef,
}: DialogBehaviorOptions): DialogBehaviorResult<T> {
  const dialogRef = useRef<T | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return

    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const explicitFocus = initialFocusRef?.current
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(explicitFocus ?? firstFocusable ?? dialogRef.current)?.focus()

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      closeRef.current()
    }
    const handleTabOutside = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const dialog = dialogRef.current
      const active = document.activeElement
      if (!dialog || (active && dialog.contains(active))) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return
      event.preventDefault()
      ;(event.shiftKey ? last : first).focus()
    }
    window.addEventListener('keydown', handleEscape)
    window.addEventListener('keydown', handleTabOutside)

    return () => {
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('keydown', handleTabOutside)
      document.body.style.overflow = previousOverflow
      const opener = openerRef.current
      if (opener?.isConnected) opener.focus()
      openerRef.current = null
    }
  }, [open, initialFocusRef])

  const onKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) return

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }, [])

  return { dialogRef, onKeyDown }
}
