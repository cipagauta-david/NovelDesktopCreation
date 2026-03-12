import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "glass" | "outline"
  size?: "sm" | "md" | "lg" | "icon"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Mapping our internal variants to the existing CSS classes in index.css
    const variantClasses = {
      primary: "primary-button",
      ghost: "ghost-button",
      glass: "panel", // Using the panel's glass effect
      outline: ""
    }
    
    // Mapping sizes to our existing buttons or creating inline styles
    const sizeStyles: React.CSSProperties = size === "icon" ? {} : {
      padding: size === "sm" ? "0.4rem 0.8rem" : size === "lg" ? "1rem 2rem" : "0.8rem 1.4rem",
      fontSize: size === "sm" ? "0.85rem" : size === "lg" ? "1.1rem" : "0.95rem",
      height: "auto",
      minHeight: size === "sm" ? "36px" : size === "lg" ? "52px" : "44px",
    }

    const baseStyle: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: size === "icon" ? "12px" : "14px",
      border: variant === "outline" ? "1px solid var(--border-subtle)" : undefined,
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
