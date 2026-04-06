import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] dark:shadow-lg dark:shadow-primary/30 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        destructive:
          "bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground shadow-lg hover:shadow-xl hover:shadow-destructive/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] dark:shadow-lg dark:shadow-destructive/30 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        outline:
          "border-2 border-border/60 bg-background/80 backdrop-blur-sm shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] dark:border-border dark:hover:bg-accent/80 dark:shadow-md",
        secondary:
          "bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground shadow-lg hover:shadow-xl hover:shadow-secondary/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] dark:shadow-lg dark:shadow-secondary/30 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        ghost: "hover:bg-accent/80 hover:text-accent-foreground active:scale-[0.98] dark:hover:bg-accent/60 transition-all duration-200",
        link: "text-primary underline-offset-4 hover:underline active:scale-[0.98] dark:text-primary hover:text-primary/80",
        success:
          "bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg hover:shadow-xl hover:shadow-green-600/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] dark:from-green-600 dark:to-green-500 dark:shadow-lg dark:shadow-green-600/30",
        warning:
          "bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg hover:shadow-xl hover:shadow-amber-600/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] dark:from-amber-600 dark:to-amber-500 dark:shadow-lg dark:shadow-amber-600/30",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-11 w-11 rounded-xl",
        xs: "h-7 rounded-lg px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
