import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type FieldProps = {
  label: ReactNode
  children: ReactNode
  hint?: ReactNode
  htmlFor?: string
  className?: string
  hintClassName?: string
}

/**
 * Field wraps a form control with a label and optional hint.
 *
 * When `htmlFor` is provided the label element is rendered separately from the
 * wrapper so the control receives exactly ONE label association (htmlFor).
 * Without `htmlFor` the label wraps children directly (implicit association).
 */
export function Field({ label, children, hint, htmlFor, className, hintClassName = 'form-hint' }: FieldProps) {
  const hint$ = hint ? <small className={hintClassName}>{hint}</small> : null

  // Explicit association: label points via htmlFor, wrapper is a neutral div
  if (htmlFor) {
    return (
      <div className={cn(className)}>
        <label htmlFor={htmlFor}>{label}</label>
        {children}
        {hint$}
      </div>
    )
  }

  // Implicit association: label wraps the control
  return (
    <label className={cn(className)}>
      {label}
      {children}
      {hint$}
    </label>
  )
}
