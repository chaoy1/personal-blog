import { createElement, type ElementType, type HTMLAttributes, type ReactNode } from 'react'

export type ContainerSize = 'default' | 'wide' | 'reading' | 'full'

export type ContainerProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType
  size?: ContainerSize
  children?: ReactNode
}

export default function Container({ as = 'div', size = 'default', className, children, ...props }: ContainerProps) {
  const classes = ['container', size === 'default' ? null : `container-${size}`, className]
    .filter(Boolean)
    .join(' ')

  return createElement(
    as,
    {
      ...props,
      className: classes || undefined,
      'data-container-size': size,
    },
    children,
  )
}
