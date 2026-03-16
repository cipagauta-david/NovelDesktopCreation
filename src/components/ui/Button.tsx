import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "ai" | "glass" | "outline"
  size?: "sm" | "md" | "lg" | "icon"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    const variantStyles: Record<NonNullable<ButtonProps["variant"]>, React.CSSProperties> = {
      primary: {
        background: "var(--accent-primary)",
        color: "var(--on-accent)",
        border: "1px solid transparent",
      },
      secondary: {
        background: "var(--bg-surface-raised)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-subtle)",
      },
      ghost: {
        background: "transparent",
        color: "var(--text-secondary)",
        border: "1px solid transparent",
      },
      ai: {
        background: "color-mix(in srgb, var(--accent-primary) 16%, var(--bg-surface-raised))",
        color: "var(--text-primary)",
        border: "1px solid color-mix(in srgb, var(--accent-primary) 28%, var(--border-subtle))",
      },
      glass: {
        background: "var(--bg-surface)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-subtle)",
      },
      outline: {
        background: "transparent",
        color: "var(--text-primary)",
        border: "1px solid var(--border-strong)",
      },
    }
    
    // Mapping sizes to our existing buttons or creating inline styles
    const sizeMap: Record<NonNullable<ButtonProps["size"]>, React.CSSProperties> = {
      sm: {
        minHeight: "var(--control-height-sm, 2rem)",
        padding: "0 var(--space-2, 0.5rem)",
        fontSize: "var(--font-size-0, 0.875rem)",
      },
      md: {
        minHeight: "var(--control-height-md, 2.25rem)",
        padding: "0 var(--space-3, 0.75rem)",
        fontSize: "var(--font-size-0, 0.875rem)",
      },
      lg: {
        minHeight: "var(--control-height-lg, 2.75rem)",
        padding: "0 var(--space-4, 1rem)",
        fontSize: "var(--font-size-1, 0.9375rem)",
      },
      icon: {},
    }

    const sizeStyles: React.CSSProperties = sizeMap[size]
    const variantBorder = String(variantStyles[variant].border ?? "1px solid transparent")
    const variantBorderColor = variantBorder.startsWith("1px solid ")
      ? variantBorder.slice("1px solid ".length)
      : variantBorder

    const baseStyle: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "var(--radius-sm)",
      border: "1px solid transparent",
      cursor: "pointer",
      gap: "var(--space-2, 0.5rem)",
      transition: "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, opacity 0.2s ease",
      opacity: props.disabled ? 0.52 : 1,
      ...sizeStyles,
      ...variantStyles[variant],
      ...style
    }

    const combinedClassName = `${size === "icon" ? "icon-button" : ""} ${className}`

    return (
      <Comp
        ref={ref}
        className={combinedClassName}
        onMouseEnter={(event: React.MouseEvent<HTMLButtonElement>) => {
          if (props.disabled) return
          if (variant === "primary") event.currentTarget.style.background = "var(--accent-hover)"
          if (variant === "ghost") {
            event.currentTarget.style.background = "color-mix(in srgb, var(--accent-primary) 10%, transparent)"
            event.currentTarget.style.color = "var(--text-primary)"
            event.currentTarget.style.borderColor = "var(--border-subtle)"
          }
        }}
        onMouseLeave={(event: React.MouseEvent<HTMLButtonElement>) => {
          if (props.disabled) return
          event.currentTarget.style.background = String(variantStyles[variant].background ?? "transparent")
          event.currentTarget.style.color = String(variantStyles[variant].color ?? "var(--text-primary)")
          event.currentTarget.style.borderColor = variantBorderColor
        }}
        style={baseStyle}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
