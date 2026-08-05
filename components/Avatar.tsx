'use client'

export default function Avatar({
  src,
  className,
  alt = '头像',
}: {
  src?: string | null
  className?: string
  alt?: string
}) {
  return (
    <img
      className={className}
      src={src && src.trim() ? src : '/avatar-default.svg'}
      alt={alt}
    />
  )
}
