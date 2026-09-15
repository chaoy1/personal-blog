import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

function exactRule(css: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1] ?? ''
}

describe('Phase 7 interaction and accessibility contracts', () => {
  it('uses the shared confirmation dialog for dirty account exits', () => {
    const source = read('app/account/page.tsx')

    expect(source).toContain('useConfirmDialog')
    expect(source).toContain('await confirm(')
    expect(source).not.toContain('window.confirm')
  })

  it('keeps the main interactive page controls visibly focused', () => {
    const album = read('app/album.css')
    const timeline = read('app/timeline.css')
    const guestbook = read('app/guestbook/guestbook.css')

    expect(album).not.toMatch(/\.album-page \.album-card:hover,[\s\S]*?outline:\s*(?:none|0)/)
    expect(exactRule(album, '.album-page .album-card:focus-visible,\n.album-page .album-back:focus-visible')).toMatch(/outline:\s*2px/)
    expect(timeline).not.toMatch(/\.timeline-page-body \.timeline-unfold:hover,[\s\S]*?outline:\s*(?:none|0)/)
    expect(exactRule(timeline, '.timeline-page-body .timeline-unfold:focus-visible')).toMatch(/outline:\s*2px/)
    const focusRules = [...guestbook.matchAll(/\.guestbook-immersive-textarea:focus-visible\s*\{([\s\S]*?)\n\}/g)]
    expect(focusRules.at(-1)?.[1] ?? '').toMatch(/outline:\s*2px/)
  })

  it('keeps the documented responsive ranges and minimum touch target contract', () => {
    const globals = read('app/globals.css')
    const refinement = read('app/refinement.css')
    const timeline = read('app/timeline.css')

    expect(globals).toContain('@media (min-width: 1200px)')
    expect(globals).toContain('@media (min-width: 900px) and (max-width: 1199px)')
    expect(globals).toContain('@media (min-width: 640px) and (max-width: 899px)')
    expect(globals).toContain('@media (max-width: 639px)')
    expect(refinement).toMatch(/\.article-nav[^\{]*\{[\s\S]*?min-height:\s*44px/)
    expect(timeline).toMatch(/\.timeline-unfold\s*\{[\s\S]*?min-height:\s*44px/)
  })
})
