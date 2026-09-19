import React from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ href, children, prefetch: _prefetch, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean | null }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: null, profile: null, signOut: vi.fn() }),
}))

vi.mock('@/components/SearchPalette', () => ({ default: () => null }))
vi.mock('@/components/ThemeToggle', () => ({ default: () => null }))

import SiteNav from '@/components/SiteNav'

const refinement = readFileSync(resolve(process.cwd(), 'app/refinement.css'), 'utf8')

afterEach(cleanup)

describe('主导航分隔菱形的悬停联动', () => {
  it('每个链接后面紧跟一枚分隔菱形，首位与末位各自少一枚', () => {
    const { container } = render(<SiteNav />)
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('.nav-links > a'))

    expect(links.length).toBeGreaterThan(2)
    // 结构决定了「一个链接的左右两枚 = 自己的下一个兄弟 + 前一个链接的下一个兄弟」
    // 末位链接后面没有菱形，所以逐个校验到倒数第二个
    links.slice(0, -1).forEach((link) => {
      expect(link.nextElementSibling?.classList.contains('nav-divider')).toBe(true)
    })
    expect(links[links.length - 1].nextElementSibling).toBeNull()
    expect(container.querySelectorAll('.nav-links > .nav-divider')).toHaveLength(links.length - 1)
  })

  it('用 + 与 :has() 精确点亮紧邻的左右两枚', () => {
    // 右邻用相邻兄弟
    expect(refinement).toMatch(/\.nav-links a:hover \+ \.nav-divider,/)
    // 左邻在悬停元素之前，+ / ~ 都够不到，必须用 :has() 反向指认
    expect(refinement).toMatch(/\.nav-links \.nav-divider:has\(\+ a:hover\)/)
    expect(refinement).toMatch(/\.nav-divider:hover\s*\{/)
    // 键盘用户也要有同样的反馈
    expect(refinement).toMatch(/\.nav-links a:focus-visible \+ \.nav-divider,/)
    expect(refinement).toMatch(/\.nav-links \.nav-divider:has\(\+ a:focus-visible\)/)
  })

  it('不使用 ~ 兄弟选择器，避免点亮右侧一整排菱形', () => {
    // a:hover ~ .nav-divider 会匹配被悬停链接之后的所有分隔符
    expect(refinement).not.toMatch(/\.nav-links a:hover ~ \.nav-divider/)
    expect(refinement).not.toMatch(/\.nav-links a:focus-visible ~ \.nav-divider/)
  })

  it('点亮时改用朱红并保留菱形角度', () => {
    const block = refinement.match(
      /\.nav-links a:hover \+ \.nav-divider,[\s\S]*?\n\}/,
    )?.[0]

    expect(block).toBeDefined()
    expect(block).toContain('border-color: var(--seal)')
    // 位移缩放不能把 rotate(45deg) 丢掉，否则菱形会被摆正
    expect(block).toContain('rotate(45deg) scale(')
    expect(refinement).toMatch(/\.nav-divider \{[\s\S]*?transition:/)
  })
})

describe('选项下方那一笔朱墨', () => {
  const brush = () => refinement.match(/\.nav-links a::before \{[\s\S]*?\n\}/)?.[0] ?? ''

  it('不是等粗直线：有厚度，且纵向有墨量变化', () => {
    const block = brush()

    expect(block).toContain('height: 4px')
    // 纵向渐变让笔腹有浓淡，而不是一块实色
    expect(block).toMatch(/background: linear-gradient\(\s*180deg/)
    expect(block).toContain('color-mix(in srgb, var(--seal) 80%, transparent)')
  })

  it('两端收细：横向遮罩必须是两端透明、中段满宽的多段曲线', () => {
    const block = brush()
    const mask = block.match(/mask-image: linear-gradient\(\s*90deg,([^;]*)\);/)?.[1] ?? ''

    expect(mask, '遮罩缺失就无法做出笔锋').not.toBe('')
    // 两端透明
    expect(mask).toMatch(/^\s*transparent 0/)
    expect(mask).toMatch(/transparent 100%\s*$/)
    // 中段满宽
    expect(mask).toMatch(/#000 42%,\s*#000 58%/)
    // 收细段要有中间档，才不是硬切
    expect(mask).toMatch(/rgba\(0, 0, 0, 0\.28\) 12%/)
    expect(mask).toMatch(/rgba\(0, 0, 0, 0\.75\) 26%/)
    // -webkit- 前缀同样要有，Safari 才收得细
    expect(block).toMatch(/-webkit-mask-image: linear-gradient\(\s*90deg,/)
  })

  it('仍然以中心为原点从中间展开', () => {
    const block = brush()

    expect(block).toContain('transform: translateX(-50%) scaleX(0)')
    expect(block).toContain('transform-origin: center')
    expect(refinement).toMatch(/\.nav-links a:hover::before,\s*\.nav-links a\.active::before \{\s*transform: translateX\(-50%\) scaleX\(1\)/)
  })
})
