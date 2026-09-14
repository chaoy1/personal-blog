import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'

export type FormFieldProps = {
  label: ReactNode
  htmlFor: string
  description?: ReactNode
  error?: ReactNode
  children: ReactNode
}

type DescribedControl = { 'aria-describedby'?: string }

export default function FormField({ label, htmlFor, description, error, children }: FormFieldProps) {
  const descriptionId = description ? `${htmlFor}-description` : null
  const errorId = error ? `${htmlFor}-error` : null
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ')
  const control = isValidElement(children)
    ? (() => {
        const element = children as ReactElement<DescribedControl>
        return cloneElement(element, {
          'aria-describedby': [element.props['aria-describedby'], describedBy].filter(Boolean).join(' ') || undefined,
        })
      })()
    : children

  return (
    <div className="form-field">
      <label htmlFor={htmlFor}>{label}</label>
      {description ? <p id={descriptionId ?? undefined} className="form-field-description">{description}</p> : null}
      {control}
      {error ? <p id={errorId ?? undefined} className="error-text" role="alert">{error}</p> : null}
    </div>
  )
}
