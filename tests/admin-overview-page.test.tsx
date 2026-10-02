import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ replace: vi.fn(), confirm: vi.fn(), notify: vi.fn() }))
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }))
const router = { replace: mocks.replace }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/components/admin/AdminConfirmDialog', () => ({ useAdminConfirm: () => ({ confirm: mocks.confirm, dialog: null }) }))
vi.mock('@/components/admin/AdminFeedback', () => ({ useAdminFeedback: () => ({ notify: mocks.notify }) }))
vi.mock('@/components/ThemeToggle', () => ({ default: () => <button>昼夜</button> }))
vi.mock('@/components/AdminHeader', () => ({ default: () => <button>退出登录</button> }))
import Overview from '@/app/admin/page'
const article = (id: string, published: boolean) => ({ id, title: id === 'draft-1' ? '真实草稿' : '真实文章', slug: id, excerpt: '数据库中的小序', published, updated_at: '2026-10-02T03:00:00Z' })
const data = { articles: { total: 37, published: 35, draft: 2, trash: 3, recent: [article('draft-1', false), article('post-1', true)], unfinished: [article('draft-1', false)] }, moments: 112, photos: 245, albums: 9, profile: { nickname: '真实博主', avatar_url: '', bio: '一段自序' }, errors: {}, generatedAt: '2026-10-02T03:00:00Z' }
const response = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response
beforeEach(() => { mocks.replace.mockReset(); mocks.confirm.mockReset().mockResolvedValue(true); mocks.notify.mockReset(); window.history.replaceState({}, '', '/admin') })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
describe('approved admin overview', () => {
 it('opens the overview with honest loading placeholders', () => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
  render(<Overview />)
  expect(screen.getByRole('heading', { name: /把日子，\s*慢慢写成篇/ })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: '管理总览' })).toHaveAttribute('data-page-state', 'loading')
  expect(screen.getByRole('link', { name: /文章.*—/ })).toBeInTheDocument()
 })
 it('uses real totals and routes drafts to the existing editor', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(data))); render(<Overview />)
  await screen.findByText('真实博主')
  expect(screen.getByRole('link', { name: /闲语.*112/ })).toHaveAttribute('href', '/admin/moments')
  expect(screen.getByRole('link', { name: /光影.*245/ })).toHaveAttribute('href', '/admin/photos')
  expect(screen.getByRole('link', { name: /文章.*37/ })).toHaveAttribute('href', '/admin/posts')
  expect(screen.getByRole('link', { name: /回收站.*03/ })).toHaveAttribute('href', '/admin/posts?view=trash')
  const list = screen.getByRole('list', { name: '最近文章' }); expect(within(list).getAllByRole('listitem')).toHaveLength(2)
  expect(within(list).getByRole('link', { name: '真实草稿' })).toHaveAttribute('href', '/admin/editor?id=draft-1')
  fireEvent.click(screen.getByRole('button', { name: /已发布/ })); expect(within(list).getAllByRole('listitem')).toHaveLength(1)
  fireEvent.change(screen.getByRole('searchbox', { name: '搜索最近文章' }), { target: { value: '不存在' } }); expect(screen.getByText('没有符合条件的最近篇目。')).toBeInTheDocument()
 })
 it('shows unavailable counts rather than fabricated zeroes on partial failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ...data, photos: null, errors: { photos: '照片读取失败' } }))); render(<Overview />)
  await screen.findByText('真实博主'); expect(screen.getByRole('link', { name: /光影.*—.*暂未读取/ })).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('部分内容暂未读取')
  expect(screen.getByRole('list', { name: '最近文章' })).toBeInTheDocument()
 })
 it('keeps loaded content visible if refresh fails, and retries', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(response(data)).mockResolvedValueOnce(response({ error: '网络不可用' }, 500)).mockResolvedValue(response(data)); vi.stubGlobal('fetch', fetcher); render(<Overview />)
  await screen.findByText('真实博主'); fireEvent.click(screen.getByRole('button', { name: '重新读取总览' })); await screen.findByText('网络不可用')
  expect(screen.getByRole('list', { name: '最近文章' })).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: '重新读取总览' })); await waitFor(() => expect(screen.queryByText('网络不可用')).not.toBeInTheDocument())
 })
 it('requires confirmation for trash and offers undo through the existing API', async () => {
  const fetcher = vi.fn().mockResolvedValue(response(data)); vi.stubGlobal('fetch', fetcher); render(<Overview />); await screen.findByText('真实博主')
  fireEvent.click(screen.getByRole('button', { name: '移入回收站：真实草稿' })); await waitFor(() => expect(fetcher).toHaveBeenCalledWith('/api/admin/posts/draft-1', { method: 'DELETE' }))
  expect(mocks.confirm).toHaveBeenCalled(); const notice = mocks.notify.mock.calls[0][0]; expect(notice.action.label).toBe('撤销'); await notice.action.run(); expect(fetcher).toHaveBeenCalledWith('/api/admin/posts/draft-1', { method: 'PATCH' })
 })
 it('returns unauthenticated users to the protected login flow', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ error: '未登录' }, 401))); render(<Overview />); await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/admin/login?next=%2Fadmin'))
 })
})
