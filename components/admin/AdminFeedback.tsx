'use client'

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

export type Notice = {
  id: string
  kind: 'success' | 'error' | 'info'
  message: string
  action?: { label: string; run: () => void }
}

type AdminFeedback = {
  notify: (notice: Omit<Notice, 'id'>) => string
  dismiss: (id: string) => void
}

const AdminFeedbackContext = createContext<AdminFeedback | null>(null)
const AUTO_DISMISS_MS = 5000

export function AdminFeedbackProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([])
  const nextId = useRef(0)
  const timeouts = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    const timeout = timeouts.current.get(id)
    if (timeout) clearTimeout(timeout)
    timeouts.current.delete(id)
    setNotices((current) => current.filter((notice) => notice.id !== id))
  }, [])

  const notify = useCallback((notice: Omit<Notice, 'id'>) => {
    const id = `notice-${++nextId.current}`
    setNotices((current) => [...current, { ...notice, id }])

    if (notice.kind !== 'error') {
      timeouts.current.set(id, setTimeout(() => dismiss(id), AUTO_DISMISS_MS))
    }

    return id
  }, [dismiss])

  useEffect(() => () => {
    timeouts.current.forEach((timeout) => clearTimeout(timeout))
    timeouts.current.clear()
  }, [])

  return (
    <AdminFeedbackContext.Provider value={{ notify, dismiss }}>
      {children}
      <div className="admin-notices" aria-label="通知">
        {notices.map((notice) => (
          <div
            key={notice.id}
            className={`admin-notice admin-notice-${notice.kind}`}
            role={notice.kind === 'error' ? 'alert' : 'status'}
            aria-live={notice.kind === 'error' ? 'assertive' : 'polite'}
          >
            <span>{notice.message}</span>
            {notice.action ? (
              <button type="button" onClick={notice.action.run}>{notice.action.label}</button>
            ) : null}
            <button type="button" aria-label="关闭通知" onClick={() => dismiss(notice.id)}>关闭</button>
          </div>
        ))}
      </div>
    </AdminFeedbackContext.Provider>
  )
}

export function useAdminFeedback() {
  const feedback = useContext(AdminFeedbackContext)
  if (!feedback) throw new Error('useAdminFeedback 必须在 AdminFeedbackProvider 内使用')
  return feedback
}
