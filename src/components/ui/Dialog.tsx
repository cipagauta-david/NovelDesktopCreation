import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className = "", style, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={`${className}`}
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 50,
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      backdropFilter: "blur(8px)",
      ...style
    }}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className = "", children, style, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={`panel ${className}`}
      style={{
        position: "fixed",
        left: "50%",
        top: "50%",
        zIndex: 51,
        transform: "translate(-50%, -50%)",
        display: "grid",
        width: "100%",
        maxWidth: "640px",
        gap: "1.5rem",
        padding: "2rem",
        boxShadow: "var(--shadow-glass)",
        backgroundColor: "var(--surface-glass)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "28px",
        ...style
      }}
      {...props}
    >
      {children}
      <DialogPrimitive.Close 
        style={{
          position: "absolute",
          right: "1.5rem",
          top: "1.5rem",
          cursor: "pointer",
          background: "transparent",
          border: "none",
          color: "var(--text-muted)",
          opacity: 0.7
        }}
        className="hover-opacity-100"
      >
        <X className="h-5 w-5" />
        <span className="sr-only">Cerrar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className = "", ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={`text-lg font-semibold leading-none tracking-tight text-white ${className}`}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
}
