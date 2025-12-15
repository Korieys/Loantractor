import * as React from "react"
import { cn } from "../../lib/utils"

// Note: Usually I would install cva and radix-ui/react-slot but for now I will implement a simpler version without those peer deps if they aren't installed.
// Wait, I didn't install cva or radix-slot. I should just use standard props or install them.
// The user plan didn't specify them, but they are standard in shadcn/ui which "premium" usually implies.
// I'll stick to simple props to avoid extra installs unless I decide to install them.
// I'll use simple props for now to keep it lightweight as requested ("micro-SaaS").

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "outline" | "ghost" | "destructive"
    size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {

        const variants = {
            default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md",
            outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
            ghost: "hover:bg-accent hover:text-accent-foreground",
            destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        }

        const sizes = {
            default: "h-10 px-4 py-2",
            sm: "h-9 rounded-md px-3",
            lg: "h-11 rounded-md px-8",
            icon: "h-10 w-10",
        }

        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    variants[variant],
                    sizes[size],
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
