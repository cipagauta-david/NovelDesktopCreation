import type { ReactNode } from 'react'

type FieldProps = {
  label: ReactNode
  children: ReactNode
  hint?: ReactNode
  className?: string
  hintClassName?: string
}

export function Field({ label, children, hint, className = '', hintClassName = 'form-hint' }: FieldProps) {
  return (
    <label className={className}>
      {label}
      {children}
      {hint ? <small className={hintClassName}>{hint}</small> : null}
    </label>
  )
}
