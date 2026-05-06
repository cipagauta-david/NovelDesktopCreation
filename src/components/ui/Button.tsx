import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import "../../styles/common/Button.css"

function Button({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      className={cn("btn", className)}
      {...props}
    />
  )
}

export { Button }
