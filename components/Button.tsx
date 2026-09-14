import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  loadingLabel?: ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingLabel = '处理中…',
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  const classes = [
    'btn',
    variant === 'primary' ? null : `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : null,
    'button-hit-area',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      {...props}
      ref={ref}
      type={props.type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-button-variant={variant}
      data-button-size={size}
    >
      {loading ? loadingLabel : children}
    </button>
  )
})

export default Button
