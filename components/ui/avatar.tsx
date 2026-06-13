'use client'

import * as React from 'react'
import { cn, getInitials } from '@/lib/utils'

interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string | null
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  xs: 'h-6  w-6  text-xs',
  sm: 'h-8  w-8  text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

function Avatar({ src, name, size = 'md', className, ...props }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false)
  const showImage = src && !imgError
  const initials = name ? getInitials(name) : '?'

  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0',
        'bg-surface-overlay border border-border',
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ?? 'avatar'}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="font-semibold text-text-secondary select-none">{initials}</span>
      )}
    </span>
  )
}

export { Avatar }
