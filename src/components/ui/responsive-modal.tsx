import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

interface ResponsiveModalContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full"
}

const ResponsiveModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ResponsiveModalContentProps
>(({ className, children, size = "lg", ...props }, ref) => {
  const sizeClasses = {
    sm: "max-w-sm sm:max-w-sm",
    md: "max-w-md sm:max-w-md",
    lg: "max-w-lg sm:max-w-lg md:max-w-lg",
    xl: "max-w-xl sm:max-w-xl md:max-w-xl",
    "2xl": "max-w-2xl sm:max-w-2xl md:max-w-2xl",
    "3xl": "max-w-3xl sm:max-w-3xl md:max-w-3xl",
    "4xl": "max-w-4xl sm:max-w-4xl md:max-w-4xl",
    "full": "max-w-[95vw] sm:max-w-[95vw] md:max-w-[90vw]"
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        dir="rtl"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-0",
          "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          sizeClasses[size],
          "max-h-[90vh] sm:max-h-[85vh]",
          "p-3 sm:p-4 md:p-6",
          "bg-background/98 backdrop-blur-xl",
          "border-2 border-border/60",
          "shadow-2xl",
          "rounded-lg sm:rounded-xl md:rounded-2xl",
          "dark:bg-card/98 dark:border-border/60",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute left-2 sm:left-3 top-2 sm:top-3 md:top-4 rounded-lg p-1.5 sm:p-2 opacity-70 ring-offset-background transition-all duration-200 hover:opacity-100 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground group">
          <X className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 group-hover:rotate-90" />
          <span className="sr-only">إغلاق</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
ResponsiveModalContent.displayName = DialogPrimitive.Content.displayName

const ResponsiveModalHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4",
      "p-2 sm:p-3 md:p-4",
      "border-b border-border/40",
      "text-right",
      className
    )}
    {...props}
  />
)
ResponsiveModalHeader.displayName = "ResponsiveModalHeader"

const ResponsiveModalBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex-1 overflow-y-auto",
      "p-3 sm:p-4 md:p-6",
      "max-h-[calc(90vh-180px)] sm:max-h-[calc(85vh-160px)]",
      "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2",
      "[&::-webkit-scrollbar-track]:bg-transparent",
      "[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30",
      "[&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/50",
      "[&::-webkit-scrollbar-corner]:bg-transparent",
      className
    )}
    {...props}
  />
)
ResponsiveModalBody.displayName = "ResponsiveModalBody"

const ResponsiveModalFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:items-center",
      "gap-2 sm:gap-3",
      "p-3 sm:p-4 md:p-6",
      "pt-3 sm:pt-4",
      "border-t border-border/40",
      "bg-muted/20",
      className
    )}
    {...props}
  />
)
ResponsiveModalFooter.displayName = "ResponsiveModalFooter"

const ResponsiveModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg sm:text-xl font-bold leading-none tracking-tight text-foreground",
      className
    )}
    {...props}
  />
))
ResponsiveModalTitle.displayName = DialogPrimitive.Title.displayName

const ResponsiveModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
))
ResponsiveModalDescription.displayName = DialogPrimitive.Description.displayName

interface ResponsiveModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full"
}

function ResponsiveModal({
  open,
  onOpenChange,
  children,
  size = "lg"
}: ResponsiveModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent size={size}>
        {children}
      </ResponsiveModalContent>
    </Dialog>
  )
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalBody,
  ResponsiveModalFooter,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
}