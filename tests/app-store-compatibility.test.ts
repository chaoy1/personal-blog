import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(process.cwd())
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('AppStore compatibility boundary', () => {
  it('composes the new contexts instead of owning resource fetches', () => {
    const source = read('lib/app-store.tsx')
    expect(source).toContain('AuthProvider')
    expect(source).toContain('PublicResourceCacheProvider')
    expect(source).toContain('MomentsProvider')
    expect(source).toContain('AlbumsProvider')
    expect(source).toContain('GuestbookProvider')
    expect(source).toContain('CommentsProvider')
    expect(source).toContain('export function AppStoreProvider')
    expect(source).toContain('export function useAppStore')
    expect(source).not.toContain(".from('guestbook')")
    expect(source).not.toContain(".from('moments')")
    expect(source).not.toContain(".from('albums')")
    expect(source).not.toContain(".from('comments')")
  })

  it('moves current consumers to focused hooks', () => {
    for (const path of [
      'components/SiteNav.tsx',
      'components/Comments.tsx',
      'app/account/page.tsx',
      'app/moments/page.tsx',
      'app/album/page.tsx',
      'app/guestbook/page.tsx',
    ]) {
      expect(read(path), path).not.toContain("from '@/lib/app-store'")
    }
  })
})
