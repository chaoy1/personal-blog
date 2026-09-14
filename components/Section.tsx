import { createElement, type ElementType, type HTMLAttributes, type ReactNode } from 'react'

export type SectionSpace = 'tight' | 'default' | 'loose'

export type SectionProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType
  space?: SectionSpace
  children?: ReactNode
}

export default function Section({ as = 'div', space = 'default', className, children, ...props }: SectionProps) {
  const classes = ['section', space === 'default' ? null : `section-${space}`, className]
    .filter(Boolean)
    .join(' ')

  return createElement(
    as,
    {
      ...props,
      className: classes || undefined,
      'data-section-space': space,
    },
    children,
  )
}
