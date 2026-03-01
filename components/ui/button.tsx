import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "secondary" | "outline"
  size?: "sm" | "default"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    
    const sizeStyles = {
      sm: "h-8 px-3 text-xs",
      default: "h-10 px-4 py-2",
    }
    
    const variants = {
      default: "bg-white/10 text-white hover:bg-white/20 border border-white/10",
      ghost: "hover:bg-white/10 text-white/80 hover:text-white",
      secondary: "bg-white/5 text-white/80 hover:bg-white/10",
      outline: "border border-white/20 text-white/80 hover:bg-white/10 hover:text-white",
    }

    return (
      <button
        className={`${baseStyles} ${sizeStyles[size]} ${variants[variant]} ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
