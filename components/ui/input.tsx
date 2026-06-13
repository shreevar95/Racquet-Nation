import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-text-muted pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={cn(
              'flex h-10 w-full rounded-md border bg-surface-raised px-3 py-2',
              'text-sm text-text-primary placeholder:text-text-muted',
              'border-border focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
              'transition-colors duration-150',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              error && 'border-error focus:border-error focus:ring-error/20',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 text-text-muted pointer-events-none">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
        {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'

export { Input }
