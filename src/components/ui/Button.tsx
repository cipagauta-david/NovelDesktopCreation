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
    
    // Mapping our internal variants to the existing CSS classes in index.css
    const variantClasses: Record<string, string> = {
      primary: "primary-button",
      secondary: "secondary-button",
      ghost: "ghost-button",
      ai: "ai-button",
      glass: "panel", // Using the panel's glass effect
      outline: "outline-button"
    }
    
    // Mapping sizes to our existing buttons or creating inline styles
    const sizeStyles: React.CSSProperties = size === "icon" ? {} : {
      padding: size === "sm" ? "var(--btn-padding-sm)" : size === "md" ? "var(--btn-padding-md)" : "1rem 2rem",
      fontSize: size === "sm" ? "0.85rem" : size === "lg" ? "1.1rem" : "0.95rem",
      height: "auto",
      minHeight: size === "sm" ? "32px" : size === "lg" ? "52px" : "36px",
    }

    const baseStyle: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "var(--btn-radius)",
      border: variant === "outline" ? "1px solid var(--color-border)" : undefined,
      backgroundColor: variant === "outline" ? "transparent" : undefined,
      cursor: "pointer",
      gap: "0.5rem",
      ...sizeStyles,
      ...style
    }

    const combinedClassName = `${variantClasses[variant] || ""} ${size === "icon" ? "icon-button" : ""} ${className}`

    return (
      <Comp
        ref={ref}
        className={combinedClassName}
        style={baseStyle}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
