import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border-2 border-border/60 bg-background/80 backdrop-blur-sm px-4 py-2 text-sm shadow-sm transition-all duration-300 ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20 focus-visible:border-primary hover:border-primary/50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:bg-card/80 dark:border-border dark:text-foreground dark:placeholder:text-muted-foreground/50 dark:focus-visible:ring-primary/30 dark:hover:border-primary/40",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
