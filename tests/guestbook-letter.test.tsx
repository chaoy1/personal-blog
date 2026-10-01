import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import GuestbookLetter from '@/components/GuestbookLetter'
import { formatGuestbookDate } from '@/lib/guestbook-design'

afterEach(() => { cleanup(); vi.restoreAllMocks() })
it('renders a Chinese date with a machine readable timestamp and preserves the content', () => {
  render(<GuestbookLetter name="清和" date="2026-09-29T08:00:00Z" number={1} replyCount={0} actions={<button>回复</button>}>原信内容</GuestbookLetter>)
  expect(screen.getByText('原信内容')).toBeInTheDocument()
  expect(document.querySelector('time')).toHaveAttribute('datetime', '2026-09-29T08:00:00Z')
  expect(document.querySelector('time')).toHaveTextContent('二〇二六年九月廿九')
  expect(formatGuestbookDate('bad date').full).toBe('日期未详')
})
it('changes only the accent on reentry and keeps it steady while moving inside', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0)
  render(<GuestbookLetter name="听雨" date="2026-09-18" number={2} replyCount={0} actions={<button>回复</button>}>原信内容</GuestbookLetter>)
  const letter=screen.getByRole('article')
  fireEvent.focus(letter.querySelector('button')!)
  const first=letter.getAttribute('data-hover-tone')
  fireEvent.focus(letter.querySelector('button')!, { relatedTarget: letter })
  expect(letter).toHaveAttribute('data-hover-tone', first)
  fireEvent.blur(letter.querySelector('button')!)
  fireEvent.focus(letter.querySelector('button')!)
  expect(letter.getAttribute('data-hover-tone')).not.toBe(first)
})
